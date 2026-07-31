package com.foodtrace.api.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Makes a "log out everywhere" possible even though JWTs are otherwise
 * stateless, via two complementary mechanisms:
 *  - users.token_valid_after is bumped to now() on password change, which
 *    invalidates EVERY token for that user (all devices).
 *  - token_blacklist stores a SHA-256 hash of a specific token on logout,
 *    which invalidates only that one token (this device), leaving other
 *    signed-in devices untouched.
 * The timestamp comparison runs in SQL rather than in Java since JDBC
 * drivers hand timestamptz columns back as java.sql.Timestamp, not
 * java.time types.
 */
@Service
public class TokenRevocationService {
  private final JdbcClient jdbc;

  public TokenRevocationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public boolean isStillValid(String userId, Instant issuedAt) {
    Map<String, Object> row = jdbc.sql("""
        SELECT (token_valid_after IS NULL OR CAST(:issuedAt AS timestamptz) >= token_valid_after) AS still_valid
        FROM users WHERE id = CAST(:id AS uuid)
        """)
        .param("issuedAt", Timestamp.from(issuedAt))
        .param("id", userId)
        .query((rs, rowNum) -> Map.<String, Object>of("stillValid", rs.getBoolean("still_valid")))
        .optional()
        .orElse(null);
    return row == null || Boolean.TRUE.equals(row.get("stillValid"));
  }

  public void revokeAllTokensForUser(String userId) {
    jdbc.sql("UPDATE users SET token_valid_after = now() WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .update();
  }

  public boolean isBlacklisted(String rawToken) {
    return jdbc.sql("SELECT 1 FROM token_blacklist WHERE token_hash = :hash")
        .param("hash", sha256(rawToken))
        .query(Integer.class)
        .optional()
        .isPresent();
  }

  /** Blacklists a single token until its own expiry, after which the row is dead weight anyway. */
  public void blacklistToken(String rawToken, String userId, Instant tokenExpiresAt) {
    jdbc.sql("""
        INSERT INTO token_blacklist (token_hash, user_id, expires_at)
        VALUES (:hash, CAST(:userId AS uuid), CAST(:expiresAt AS timestamptz))
        ON CONFLICT (token_hash) DO NOTHING
        """)
        .param("hash", sha256(rawToken))
        .param("userId", userId)
        .param("expiresAt", Timestamp.from(tokenExpiresAt))
        .update();
  }

  public void cleanupExpiredBlacklistEntries() {
    jdbc.sql("DELETE FROM token_blacklist WHERE expires_at < now()").update();
  }

  private static String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder(hash.length * 2);
      for (byte b : hash) hex.append(String.format("%02x", b));
      return hex.toString();
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
