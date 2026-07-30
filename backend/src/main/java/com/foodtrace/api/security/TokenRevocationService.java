package com.foodtrace.api.security;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
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
}
