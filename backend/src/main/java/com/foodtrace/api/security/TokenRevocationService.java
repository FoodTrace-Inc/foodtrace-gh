package com.foodtrace.api.security;

import java.time.Instant;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Makes a "log out everywhere" possible even though JWTs are otherwise
 * stateless: users.token_valid_after is bumped to now() whenever a password
 * is reset, and any token issued before that instant is rejected here even
 * if its signature and expiry are still fine.
 */
@Service
public class TokenRevocationService {
  private final JdbcClient jdbc;

  public TokenRevocationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public boolean isStillValid(String userId, Instant issuedAt) {
    OffsetDateTime validAfter = jdbc.sql("SELECT token_valid_after FROM users WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .query(OffsetDateTime.class)
        .optional()
        .orElse(null);
    return validAfter == null || !issuedAt.isBefore(validAfter.toInstant());
  }

  public void revokeAllTokensForUser(String userId) {
    jdbc.sql("UPDATE users SET token_valid_after = now() WHERE id = CAST(:id AS uuid)")
        .param("id", userId)
        .update();
  }
}
