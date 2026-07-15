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
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
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
  private final SecureRandom random = new SecureRandom();

  private static final String PASSWORD_RESET_PURPOSE = "password_reset";

  public AuthService(JdbcClient jdbc, JwtService jwtService, PasswordEncoder passwordEncoder, AppProperties properties, EmailService emailService) {
    this.jdbc = jdbc;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
    this.properties = properties;
    this.emailService = emailService;
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
    String securityQuestion = blankToNull(request.securityQuestion());
    String securityAnswerHash = blankToNull(request.securityAnswer()) == null
        ? null : passwordEncoder.encode(normalizeAnswer(request.securityAnswer()));
    Map<String, Object> user = jdbc.sql("""
        INSERT INTO users (full_name, phone, email, password_hash, role, language, is_verified, is_active, security_question, security_answer_hash)
        VALUES (:fullName, :phone, :email, :passwordHash, CAST(:role AS user_role), :language, false, true, :securityQuestion, :securityAnswerHash)
        RETURNING id, full_name, phone, email, role, language, is_verified, is_active
        """)
        .param("fullName", request.fullName())
        .param("phone", phone)
        .param("email", email)
        .param("passwordHash", passwordEncoder.encode(request.password()))
        .param("role", request.role())
        .param("language", valueOrDefault(request.language(), "en"))
        .param("securityQuestion", securityQuestion)
        .param("securityAnswerHash", securityAnswerHash)
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

  public AuthUser me(String userId) {
    return findUserById(userId).map(this::toUser)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
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
