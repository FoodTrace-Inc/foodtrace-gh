package com.foodtrace.api.service;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Records who did what to which entity — recalls, report reviews, and other
 * safety-critical actions a regulator would need to audit. Best-effort: a
 * logging failure never blocks the action it's recording.
 */
@Service
public class AuditLogService {
  private final JdbcClient jdbc;

  public AuditLogService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public void log(String userId, String action, String entityType, String entityId, Map<String, Object> metadata) {
    try {
      String json = toJson(metadata);
      jdbc.sql("""
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES (CAST(:userId AS uuid), :action, :entityType, CAST(:entityId AS uuid), CAST(:metadata AS jsonb))
          """)
          .param("userId", userId)
          .param("action", action)
          .param("entityType", entityType)
          .param("entityId", entityId)
          .param("metadata", json)
          .update();
    } catch (Exception ignored) {
      // Auditing is best-effort — never let a logging failure block the real action.
    }
  }

  public List<Map<String, Object>> recent(int limit) {
    return jdbc.sql("""
        SELECT al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at,
               u.full_name AS actor_name, u.role AS actor_role
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT :limit
        """)
        .param("limit", limit)
        .query(DatabaseRowMapper::toMap)
        .list();
  }

  private static String toJson(Map<String, Object> metadata) {
    if (metadata == null || metadata.isEmpty()) return "{}";
    StringBuilder sb = new StringBuilder("{");
    boolean first = true;
    for (Map.Entry<String, Object> e : metadata.entrySet()) {
      if (!first) sb.append(",");
      first = false;
      sb.append("\"").append(e.getKey().replace("\"", "\\\"")).append("\":\"")
          .append(String.valueOf(e.getValue()).replace("\"", "\\\"")).append("\"");
    }
    return sb.append("}").toString();
  }
}
