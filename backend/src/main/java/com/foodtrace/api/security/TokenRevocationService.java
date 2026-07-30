package com.foodtrace.api.security;

import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Makes a "log out everywhere" possible even though JWTs are otherwise
 * stateless: users.token_valid_after is bumped to now() whenever a password
 * is reset, and any token issued before that instant is rejected here even
 * if its signature and expiry are still fine. The comparison runs in SQL
 * (rather than fetching the timestamp into Java) since JDBC drivers hand
 * timestamptz columns back as java.sql.Timestamp, not java.time types.
 */
@Service
public class TokenRevocationService {
  private final JdbcClient jdbc;

  public TokenRevocationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public boolean isStillValid(String userId, Instant issuedAt) {
    return jdbc.sql("""
        SELECT (token_valid_after IS NULL OR :issuedAt >= token_valid_after) AS still_valid
        FROM users WHERE id = CAST(:id AS uuid)
        """)
        .param("issuedAt", issuedAt)
        .param("id", userId)
        .query(Boolean.class)
        .optional()
        .orElse(true);
  }

  public void revokeAllTokensForUser(String userId) {
    jdbc.sql("UPDATE users SET token_valid_after = now() WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .update();
  }
}
