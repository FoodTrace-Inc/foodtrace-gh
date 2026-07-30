package com.foodtrace.api.service;

import com.foodtrace.api.config.AppProperties;
import com.foodtrace.api.dto.ApiDtos;
import com.foodtrace.api.dto.ApiDtos.AuthResponse;
import com.foodtrace.api.dto.ApiDtos.AuthUser;
import com.foodtrace.api.dto.ApiDtos.LoginRequest;
import com.foodtrace.api.dto.ApiDtos.OtpRequest;
import com.foodtrace.api.dto.ApiDtos.RegisterRequest;
import com.foodtrace.api.dto.ApiDtos.VerifyOtpRequest;
import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.security.JwtService;
import com.foodtrace.api.security.TokenRevocationService;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final JdbcClient jdbc;
  private final JwtService jwtService;
  private final PasswordEncoder passwordEncoder;
  private final AppProperties properties;
  private final EmailService emailService;
  private final AuditLogService auditLogService;
  private final PushNotificationService pushNotificationService;
  private final TokenRevocationService tokenRevocationService;
  private final SecureRandom random = new SecureRandom();

  private static final String PASSWORD_RESET_PURPOSE = "password_reset";
  private static final int MAX_ANSWER_ATTEMPTS = 3;
  private static final Duration ANSWER_LOCKOUT = Duration.ofMinutes(15);
  private static final Duration START_SESSION_TTL = Duration.ofMinutes(10);
  private static final Duration RESET_TOKEN_TTL = Duration.ofMinutes(5);
  private static final int MAX_IP_ATTEMPTS_PER_HOUR = 10;

  public AuthService(JdbcClient jdbc, JwtService jwtService, PasswordEncoder passwordEncoder, AppProperties properties,
      EmailService emailService, AuditLogService auditLogService, PushNotificationService pushNotificationService,
      TokenRevocationService tokenRevocationService) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
    this.properties = properties;
    this.emailService = emailService;
    this.auditLogService = auditLogService;
    this.pushNotificationService = pushNotificationService;
    this.tokenRevocationService = tokenRevocationService;
  }

  public Map<String, Object> requestOtp(OtpRequest request) {
    requirePresent(request.identifier(), "Identifier is required");
    Map<String, Object> user = findUserByIdentifier(request.identifier())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    String token = String.valueOf(100000 + random.nextInt(900000));
    OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(10);
    jdbc.sql("INSERT INTO otp_tokens (user_id, token, purpose, expires_at) VALUES (:userId, :token, :purpose, :expiresAt)")
        .param("userId", user.get("id"))
        .param("token", token)
        .param("purpose", valueOrDefault(request.purpose(), "login"))
        .param("expiresAt", expiresAt)
        .update();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("sent", true);
    response.put("expiresAt", expiresAt.toString());
    if (properties.exposeOtp()) {
      response.put("otp", token);
    }
    return response;
  }

  public AuthResponse verifyOtp(VerifyOtpRequest request) {
    requirePresent(request.identifier(), "Identifier is required");
    requirePresent(request.token(), "OTP token is required");
    Map<String, Object> user = findUserByIdentifier(request.identifier())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    Map<String, Object> otp = jdbc.sql("""
        SELECT id, used_at, (expires_at < now()) AS is_expired
        FROM otp_tokens
        WHERE user_id = :userId AND token = :token AND purpose = :purpose
        ORDER BY created_at DESC
        LIMIT 1
        """)
        .param("userId", user.get("id"))
        .param("token", request.token())
        .param("purpose", valueOrDefault(request.purpose(), "login"))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP"));
    if (otp.get("usedAt") != null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP already used");
    }
    if (Boolean.TRUE.equals(otp.get("isExpired"))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP expired");
    }
    jdbc.sql("UPDATE otp_tokens SET used_at = now() WHERE id = :id").param("id", otp.get("id")).update();
    return authResponse(user);
  }

  public AuthResponse register(RegisterRequest request) {
    requirePresent(request.fullName(), "Full name is required");
    requirePresent(request.password(), "Password is required");
    if (blankToNull(request.phone()) == null && blankToNull(request.email()) == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone or email is required");
    }
    if (!ApiDtos.USER_ROLES.contains(request.role())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported role");
    }
    String phone = blankToNull(request.phone());
    String email = blankToNull(request.email());
    if (email != null && !isValidEmail(email)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email address (e.g. name@example.com)");
    }
    if (phone != null && !isValidGhanaPhone(phone)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid Ghana phone number (e.g. 024 123 4567)");
    }
    // Normalise so login is consistent (email stored lowercase, phone trimmed).
    if (email != null) email = email.trim().toLowerCase();
    if (phone != null) phone = phone.trim();
    if (phone != null && userExistsByPhone(phone)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
    }
    if (email != null && userExistsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
    }
    requirePresent(request.securityQuestion1(), "Choose your first security question");
    requirePresent(request.securityAnswer1(), "Answer your first security question");
    requirePresent(request.securityQuestion2(), "Choose your second security question");
    requirePresent(request.securityAnswer2(), "Answer your second security question");
    if (!SecurityQuestionCatalog.isValidId(request.securityQuestion1()) || !SecurityQuestionCatalog.isValidId(request.securityQuestion2())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unrecognized security question");
    }
    if (request.securityQuestion1().trim().equalsIgnoreCase(request.securityQuestion2().trim())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose two different questions");
    }
    if (request.securityAnswer1().trim().length() < 3 || request.securityAnswer2().trim().length() < 3) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each answer must be at least 3 characters");
    }
    String question1Text = SecurityQuestionCatalog.textFor(request.securityQuestion1());
    String question2Text = SecurityQuestionCatalog.textFor(request.securityQuestion2());
    String answer1Hash = passwordEncoder.encode(normalizeAnswer(request.securityAnswer1()));
    String answer2Hash = passwordEncoder.encode(normalizeAnswer(request.securityAnswer2()));
    Map<String, Object> user = jdbc.sql("""
        INSERT INTO users (full_name, phone, email, password_hash, role, language, is_verified, is_active,
                            security_question_1, security_answer_1_hash, security_question_2, security_answer_2_hash)
        VALUES (:fullName, :phone, :email, :passwordHash, CAST(:role AS user_role), :language, false, true,
                :question1, :answer1Hash, :question2, :answer2Hash)
        RETURNING id, full_name, phone, email, role, language, is_verified, is_active
        """)
        .param("fullName", request.fullName())
        .param("phone", phone)
        .param("email", email)
        .param("passwordHash", passwordEncoder.encode(request.password()))
        .param("role", request.role())
        .param("language", valueOrDefault(request.language(), "en"))
        .param("question1", question1Text)
        .param("answer1Hash", answer1Hash)
        .param("question2", question2Text)
        .param("answer2Hash", answer2Hash)
        .query(DatabaseRowMapper::toMap)
        .single();
    return authResponse(user);
  }

  public AuthResponse login(LoginRequest request) {
    requirePresent(request.identifier(), "Identifier is required");
    requirePresent(request.password(), "Password is required");
    String identifier = request.identifier().trim();
    Map<String, Object> user = jdbc.sql("""
        SELECT id, full_name, phone, email, password_hash, role, language, is_verified, is_active
        FROM users
        WHERE LOWER(email) = LOWER(:identifier) OR phone = :identifier
        LIMIT 1
        """)
        .param("identifier", identifier)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwordEncoder.matches(request.password(), String.valueOf(user.get("passwordHash")))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
    return authResponse(user);
  }

  /**
   * Always returns a generic success response, whether or not the email is
   * registered — this avoids leaking which emails have accounts.
   */
  public Map<String, Object> forgotPassword(ApiDtos.ForgotPasswordRequest request) {
    requirePresent(request.email(), "Email is required");
    String email = request.email().trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
    }
    findUserByIdentifier(email).ifPresent(user -> {
      String code = String.format("%06d", random.nextInt(1_000_000));
      OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(15);
      jdbc.sql("INSERT INTO otp_tokens (user_id, token, purpose, expires_at) VALUES (:userId, :token, :purpose, :expiresAt)")
          .param("userId", user.get("id"))
          .param("token", code)
          .param("purpose", PASSWORD_RESET_PURPOSE)
          .param("expiresAt", expiresAt)
          .update();
      emailService.sendPasswordResetCode(email, code);
    });
    return Map.of("sent", true, "message", "If that email is registered, a reset code is on its way.");
  }

  public Map<String, Object> resetPassword(ApiDtos.ResetPasswordRequest request) {
    requirePresent(request.email(), "Email is required");
    requirePresent(request.code(), "Reset code is required");
    requirePresent(request.newPassword(), "New password is required");
    if (request.newPassword().length() < 6) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
    }
    String email = request.email().trim().toLowerCase();
    Map<String, Object> user = findUserByIdentifier(email)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code"));
    Map<String, Object> otp = jdbc.sql("""
        SELECT id, used_at, (expires_at < now()) AS is_expired
        FROM otp_tokens
        WHERE user_id = :userId AND token = :token AND purpose = :purpose
        ORDER BY created_at DESC
        LIMIT 1
        """)
        .param("userId", user.get("id"))
        .param("token", request.code().trim())
        .param("purpose", PASSWORD_RESET_PURPOSE)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code"));
    if (otp.get("usedAt") != null || Boolean.TRUE.equals(otp.get("isExpired"))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code");
    }
    jdbc.sql("UPDATE otp_tokens SET used_at = now() WHERE id = :id").param("id", otp.get("id")).update();
    jdbc.sql("UPDATE users SET password_hash = :hash, updated_at = now() WHERE id = :id")
        .param("hash", passwordEncoder.encode(request.newPassword()))
        .param("id", user.get("id"))
        .update();
    return Map.of("reset", true, "message", "Password updated. Log in with your new password.");
  }

  // ── Security-question recovery (works with no email/SMS delivery) ───────────

  /** Returns the security question for an account, so the reset screen can show it. */
  public Map<String, Object> lookupSecurityQuestion(ApiDtos.SecurityQuestionLookupRequest request) {
    requirePresent(request.identifier(), "Enter your email or phone number");
    Map<String, Object> row = jdbc.sql("""
        SELECT security_question
        FROM users
        WHERE (:isEmail IS TRUE AND LOWER(email) = :identifier)
           OR (:isEmail IS FALSE AND phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = :phoneDigits)
        LIMIT 1
        """)
        .param("isEmail", request.identifier().contains("@"))
        .param("identifier", request.identifier().trim().toLowerCase())
        .param("phoneDigits", request.identifier().replaceAll("\\D", ""))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for that email or phone number"));
    String question = stringOrNull(row.get("securityQuestion"));
    if (question == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No security question is set on this account");
    }
    return Map.of("question", question);
  }

  /** Verifies the security answer, then sets a new password. */
  public Map<String, Object> resetPasswordWithSecurity(ApiDtos.SecurityResetRequest request) {
    requirePresent(request.identifier(), "Enter your email or phone number");
    requirePresent(request.answer(), "Enter your security answer");
    requirePresent(request.newPassword(), "New password is required");
    if (request.newPassword().length() < 6) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
    }
    Map<String, Object> user = jdbc.sql("""
        SELECT id, security_answer_hash
        FROM users
        WHERE (:isEmail IS TRUE AND LOWER(email) = :identifier)
           OR (:isEmail IS FALSE AND phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = :phoneDigits)
        LIMIT 1
        """)
        .param("isEmail", request.identifier().contains("@"))
        .param("identifier", request.identifier().trim().toLowerCase())
        .param("phoneDigits", request.identifier().replaceAll("\\D", ""))
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect answer"));
    String hash = stringOrNull(user.get("securityAnswerHash"));
    if (hash == null || !passwordEncoder.matches(normalizeAnswer(request.answer()), hash)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect answer");
    }
    jdbc.sql("UPDATE users SET password_hash = :hash, updated_at = now() WHERE id = :id")
        .param("hash", passwordEncoder.encode(request.newPassword()))
        .param("id", user.get("id"))
        .update();
    return Map.of("reset", true, "message", "Password updated. Log in with your new password.");
  }

  /** Lets a signed-in user set or change their security question. */
  public Map<String, Object> setSecurityQuestion(String userId, ApiDtos.SetSecurityQuestionRequest request) {
    requirePresent(request.securityQuestion(), "Choose a security question");
    requirePresent(request.securityAnswer(), "Enter an answer");
    jdbc.sql("UPDATE users SET security_question = :question, security_answer_hash = :hash, updated_at = now() WHERE id = :id")
        .param("question", request.securityQuestion().trim())
        .param("hash", passwordEncoder.encode(normalizeAnswer(request.securityAnswer())))
        .param("id", userId)
        .update();
    return Map.of("saved", true, "message", "Security question saved.");
  }

  /** Answers compare case- and whitespace-insensitively so "Accra" == " accra ". */
  private static String normalizeAnswer(String answer) {
    return answer.trim().toLowerCase().replaceAll("\\s+", " ");
  }

  // ── Two-question forgot-password wizard ─────────────────────────────────

  public List<ApiDtos.SecurityQuestionOption> securityQuestionCatalog() {
    return SecurityQuestionCatalog.QUESTIONS;
  }

  /**
   * Lets a signed-in user add or replace their two catalog-based security
   * questions — this is how an account that only has one question set (any
   * pre-existing account) gains a second one, without ever forcing a reset.
   */
  public Map<String, Object> setSecurityQuestions(String userId, ApiDtos.SecurityQuestionsUpdateRequest request) {
    requirePresent(request.securityQuestion1(), "Choose your first security question");
    requirePresent(request.securityAnswer1(), "Answer your first security question");
    requirePresent(request.securityQuestion2(), "Choose your second security question");
    requirePresent(request.securityAnswer2(), "Answer your second security question");
    if (!SecurityQuestionCatalog.isValidId(request.securityQuestion1()) || !SecurityQuestionCatalog.isValidId(request.securityQuestion2())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unrecognized security question");
    }
    if (request.securityQuestion1().trim().equalsIgnoreCase(request.securityQuestion2().trim())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose two different questions");
    }
    if (request.securityAnswer1().trim().length() < 3 || request.securityAnswer2().trim().length() < 3) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each answer must be at least 3 characters");
    }
    jdbc.sql("""
        UPDATE users
        SET security_question_1 = :q1, security_answer_1_hash = :a1,
            security_question_2 = :q2, security_answer_2_hash = :a2,
            updated_at = now()
        WHERE id = CAST(:id AS uuid)
        """)
        .param("q1", SecurityQuestionCatalog.textFor(request.securityQuestion1()))
        .param("a1", passwordEncoder.encode(normalizeAnswer(request.securityAnswer1())))
        .param("q2", SecurityQuestionCatalog.textFor(request.securityQuestion2()))
        .param("a2", passwordEncoder.encode(normalizeAnswer(request.securityAnswer2())))
        .param("id", userId)
        .update();
    return Map.of("saved", true, "message", "Security questions saved.");
  }

  /**
   * Step A. Always returns a session + a first question, whether or not the
   * account exists — a decoy question is used for unknown identifiers so the
   * response shape never reveals account existence. Decoy sessions have no
   * user_id, so every later answer is guaranteed to fail verification.
   */
  public Map<String, Object> startForgotPassword(ApiDtos.ForgotPasswordStartRequest request, String ip) {
    requirePresent(request.identifier(), "Enter your email or phone number");
    enforceIpRateLimit(ip);
    auditLogService.log(null, "password_reset_started", "user", null, Map.of("identifier", mask(request.identifier())), ip, true);

    Optional<Map<String, Object>> userRow = findUserByIdentifier(request.identifier());
    String userId = null;
    String question1Text;
    String question2Text;
    if (userRow.isPresent()) {
      Map<String, Object> securityRow = jdbc.sql("SELECT security_question_1, security_question_2 FROM users WHERE id = :id")
          .param("id", userRow.get().get("id"))
          .query(DatabaseRowMapper::toMap)
          .single();
      String q1 = stringOrNull(securityRow.get("securityQuestion1"));
      if (q1 != null) {
        userId = String.valueOf(userRow.get().get("id"));
        question1Text = q1;
        question2Text = stringOrNull(securityRow.get("securityQuestion2"));
      } else {
        // Account exists but never set a security question — treat exactly
        // like an unknown identifier so nothing is revealed either way.
        question1Text = decoyQuestion(0);
        question2Text = decoyQuestion(1);
      }
    } else {
      question1Text = decoyQuestion(0);
      question2Text = decoyQuestion(1);
    }

    String sessionToken = randomToken();
    jdbc.sql("""
        INSERT INTO password_reset_sessions (session_token, user_id, question_1_text, question_2_text, expires_at)
        VALUES (:token, CAST(:userId AS uuid), :q1, :q2, :expiresAt)
        """)
        .param("token", sessionToken)
        .param("userId", userId)
        .param("q1", question1Text)
        .param("q2", question2Text)
        .param("expiresAt", OffsetDateTime.now().plus(START_SESSION_TTL))
        .update();

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("sessionToken", sessionToken);
    response.put("question1", question1Text);
    return response;
  }

  /** Step B: verify the answer to question 1. */
  public Map<String, Object> verifySecurityQuestion1(ApiDtos.VerifySecurityAnswerRequest request, String ip) {
    requirePresent(request.sessionToken(), "Reset session is required");
    requirePresent(request.answer(), "Enter your answer");
    enforceIpRateLimit(ip);
    Map<String, Object> session = loadActiveSession(request.sessionToken());
    String userId = stringOrNull(session.get("userId"));
    boolean correct = userId != null && matchesAnswerColumn(userId, "security_answer_1_hash", request.answer());
    if (!correct) {
      registerWrongAnswer(session, ip, "password_reset_q1_wrong");
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect answer");
    }
    auditLogService.log(userId, "password_reset_q1_correct", "user", userId, Map.of(), ip, true);

    String question2Text = stringOrNull(session.get("question2Text"));
    String nextToken = randomToken();
    jdbc.sql("""
        UPDATE password_reset_sessions
        SET session_token = :newToken, attempt_count = 0, q1_verified = true
        WHERE id = :id
        """)
        .param("newToken", nextToken)
        .param("id", session.get("id"))
        .update();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("sessionToken", nextToken);
    response.put("question2", question2Text);
    return response;
  }

  /** Step C: verify the answer to question 2, then hand back a short-lived reset token. */
  public Map<String, Object> verifySecurityQuestion2(ApiDtos.VerifySecurityAnswerRequest request, String ip) {
    requirePresent(request.sessionToken(), "Reset session is required");
    requirePresent(request.answer(), "Enter your answer");
    enforceIpRateLimit(ip);
    Map<String, Object> session = loadActiveSession(request.sessionToken());
    if (!Boolean.TRUE.equals(session.get("q1Verified"))) {
      // Never say *which* step failed — always the same generic message.
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect answer");
    }
    String userId = stringOrNull(session.get("userId"));
    String question2Text = stringOrNull(session.get("question2Text"));
    boolean hasSecondQuestion = userId != null && jdbc.sql("SELECT security_question_2 FROM users WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .query(String.class)
        .optional()
        .isPresent();
    boolean correct = hasSecondQuestion && matchesAnswerColumn(userId, "security_answer_2_hash", request.answer());
    if (!correct) {
      registerWrongAnswer(session, ip, "password_reset_q2_wrong");
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect answer");
    }
    auditLogService.log(userId, "password_reset_q2_correct", "user", userId, Map.of(), ip, true);

    String resetToken = randomToken();
    jdbc.sql("""
        UPDATE password_reset_sessions
        SET session_token = :newToken, attempt_count = 0, q2_verified = true, expires_at = :expiresAt
        WHERE id = :id
        """)
        .param("newToken", resetToken)
        .param("expiresAt", OffsetDateTime.now().plus(RESET_TOKEN_TTL))
        .param("id", session.get("id"))
        .update();
    return Map.of("resetToken", resetToken);
  }

  /** Step D: consumes the fully-verified session and sets the new password. */
  public Map<String, Object> resetPasswordWithToken(ApiDtos.ResetWithTokenRequest request, String ip) {
    requirePresent(request.resetToken(), "Reset session is required");
    requirePresent(request.newPassword(), "New password is required");
    validatePasswordStrength(request.newPassword());
    Map<String, Object> session = loadActiveSession(request.resetToken());
    if (!Boolean.TRUE.equals(session.get("q1Verified")) || !Boolean.TRUE.equals(session.get("q2Verified"))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reset session is not fully verified");
    }
    String userId = stringOrNull(session.get("userId"));
    if (userId == null) {
      // Decoy session — there is no real account to update, but this never
      // becomes visible: q1/q2 verification is unreachable for a decoy.
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reset session expired");
    }
    jdbc.sql("UPDATE users SET password_hash = :hash, updated_at = now() WHERE id = CAST(:id AS uuid)")
        .param("hash", passwordEncoder.encode(request.newPassword()))
        .param("id", userId)
        .update();
    tokenRevocationService.revokeAllTokensForUser(userId);
    jdbc.sql("DELETE FROM password_reset_sessions WHERE id = :id").param("id", session.get("id")).update();
    auditLogService.log(userId, "password_reset_completed", "user", userId, Map.of(), ip, true);
    pushNotificationService.sendToUser(userId, "FoodTrace GH",
        "Your password was just changed. If this was not you, contact us immediately.");
    return Map.of("success", true);
  }

  private Map<String, Object> loadActiveSession(String token) {
    Map<String, Object> session = jdbc.sql("""
        SELECT id, user_id, question_1_text, question_2_text, q1_verified, q2_verified, attempt_count, locked_until, expires_at
        FROM password_reset_sessions
        WHERE session_token = :token
        """)
        .param("token", token)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reset session expired. Please start again."));
    OffsetDateTime lockedUntil = (OffsetDateTime) session.get("lockedUntil");
    if (lockedUntil != null && lockedUntil.isAfter(OffsetDateTime.now())) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
          "Too many wrong answers. Please wait 15 minutes before trying again.");
    }
    OffsetDateTime expiresAt = (OffsetDateTime) session.get("expiresAt");
    if (expiresAt == null || expiresAt.isBefore(OffsetDateTime.now())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reset session expired. Please start again.");
    }
    return session;
  }

  private void registerWrongAnswer(Map<String, Object> session, String ip, String auditEvent) {
    int attempts = ((Number) session.getOrDefault("attemptCount", 0)).intValue() + 1;
    String userId = stringOrNull(session.get("userId"));
    auditLogService.log(userId, auditEvent, "user", userId, Map.of("attempt", String.valueOf(attempts)), ip, false);
    if (attempts >= MAX_ANSWER_ATTEMPTS) {
      jdbc.sql("UPDATE password_reset_sessions SET attempt_count = :attempts, locked_until = :lockedUntil WHERE id = :id")
          .param("attempts", attempts)
          .param("lockedUntil", OffsetDateTime.now().plus(ANSWER_LOCKOUT))
          .param("id", session.get("id"))
          .update();
      auditLogService.log(userId, "password_reset_locked", "user", userId, Map.of(), ip, false);
    } else {
      jdbc.sql("UPDATE password_reset_sessions SET attempt_count = :attempts WHERE id = :id")
          .param("attempts", attempts)
          .param("id", session.get("id"))
          .update();
    }
  }

  private boolean matchesAnswerColumn(String userId, String column, String answer) {
    String hash = jdbc.sql("SELECT " + column + " AS hash FROM users WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .map(row -> stringOrNull(row.get("hash")))
        .orElse(null);
    return hash != null && passwordEncoder.matches(normalizeAnswer(answer), hash);
  }

  private String decoyQuestion(int index) {
    List<ApiDtos.SecurityQuestionOption> options = SecurityQuestionCatalog.QUESTIONS;
    return options.get(index % options.size()).text();
  }

  private String randomToken() {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    StringBuilder hex = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) hex.append(String.format("%02x", b));
    return hex.toString();
  }

  private void enforceIpRateLimit(String ip) {
    if (ip == null || ip.isBlank()) return;
    long recent = jdbc.sql("""
        SELECT COUNT(*) FROM audit_logs
        WHERE ip_address = :ip AND action LIKE 'password_reset_%' AND created_at > now() - interval '1 hour'
        """)
        .param("ip", ip)
        .query(Long.class)
        .single();
    if (recent >= MAX_IP_ATTEMPTS_PER_HOUR) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
          "Too many password reset attempts from your location. Try again in 1 hour.");
    }
  }

  private static void validatePasswordStrength(String password) {
    if (password.length() < 8
        || password.chars().noneMatch(Character::isUpperCase)
        || password.chars().noneMatch(Character::isDigit)
        || password.chars().noneMatch(c -> "!@#$%^&*".indexOf(c) >= 0)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Password must be at least 8 characters and include an uppercase letter, a number, and a special character (!@#$%^&*)");
    }
  }

  private static String mask(String identifier) {
    if (identifier == null || identifier.length() < 3) return "***";
    return identifier.substring(0, 2) + "***";
  }

  public AuthUser me(String userId) {
    return findUserById(userId).map(this::toUser)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 * * * *")
  public void cleanupExpiredPasswordResetSessions() {
    jdbc.sql("DELETE FROM password_reset_sessions WHERE expires_at < now()").update();
  }

  private boolean userExistsByPhone(String phone) {
    return jdbc.sql("SELECT id FROM users WHERE phone = :phone LIMIT 1")
        .param("phone", phone)
        .query(DatabaseRowMapper::toMap)
        .optional()
        .isPresent();
  }

  private boolean userExistsByEmail(String email) {
    return jdbc.sql("SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1")
        .param("email", email.trim().toLowerCase())
        .query(DatabaseRowMapper::toMap)
        .optional()
        .isPresent();
  }

  private Optional<Map<String, Object>> findUserByIdentifier(String identifier) {
    String normalized = identifier == null ? "" : identifier.trim().toLowerCase();
    String phoneDigits = normalized.replaceAll("\\D", "");
    return jdbc.sql("""
        SELECT id, full_name, phone, email, role, language, is_verified, is_active
        FROM users
        WHERE (:isEmail IS TRUE AND LOWER(email) = :identifier)
           OR (:isEmail IS FALSE AND phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = :phoneDigits)
        LIMIT 1
        """)
        .param("isEmail", normalized.contains("@"))
        .param("identifier", normalized)
        .param("phoneDigits", phoneDigits)
        .query(DatabaseRowMapper::toMap)
        .optional();
  }

  private Optional<Map<String, Object>> findUserById(String userId) {
    return jdbc.sql("SELECT id, full_name, phone, email, role, language, is_verified, is_active FROM users WHERE id = :id LIMIT 1")
        .param("id", userId)
        .query(DatabaseRowMapper::toMap)
        .optional();
  }

  private AuthResponse authResponse(Map<String, Object> row) {
    AuthUser user = toUser(row);
    String token = jwtService.sign(new CurrentUser(user.id(), user.role(), user.fullName()));
    return new AuthResponse(token, user);
  }

  private AuthUser toUser(Map<String, Object> row) {
    return new AuthUser(
        String.valueOf(row.get("id")),
        String.valueOf(row.get("fullName")),
        stringOrNull(row.get("phone")),
        stringOrNull(row.get("email")),
        String.valueOf(row.get("role")),
        String.valueOf(row.getOrDefault("language", "en")),
        Boolean.TRUE.equals(row.get("isVerified")),
        Boolean.TRUE.equals(row.get("isActive")));
  }

  // A pragmatic email format check (structure only, not deliverability).
  private static final java.util.regex.Pattern EMAIL_PATTERN =
      java.util.regex.Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

  private static boolean isValidEmail(String email) {
    return EMAIL_PATTERN.matcher(email.trim()).matches();
  }

  // Ghana phone numbers: 10 digits starting 0 (024 123 4567) or intl 233XXXXXXXXX.
  private static boolean isValidGhanaPhone(String phone) {
    String digits = phone.replaceAll("\\D", "");
    return digits.matches("0\\d{9}") || digits.matches("233\\d{9}");
  }

  private static void requirePresent(String value, String message) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
  }

  private static String valueOrDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private static String stringOrNull(Object value) {
    return value == null ? null : String.valueOf(value);
  }
}
