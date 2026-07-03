package com.foodtrace.api.service;

import com.foodtrace.api.security.CurrentUser;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * In-app notifications. Other services call {@link #notify} / {@link #notifyRegulators}
 * when something happens (post approved, new comment, recall, pending review);
 * the mobile bell reads them via the controller.
 */
@Service
public class NotificationService {
  private final JdbcClient jdbc;

  public NotificationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public void notify(String userId, String type, String title, String body, String postId) {
    if (userId == null) return;
    jdbc.sql("""
        INSERT INTO notifications (user_id, type, title, body, post_id)
        VALUES (CAST(:u AS uuid), :t, :ti, :b, CAST(:p AS uuid))
        """)
        .param("u", userId)
        .param("t", type)
        .param("ti", title)
        .param("b", body == null ? "" : body)
        .param("p", postId)
        .update();
  }

  public void notifyRegulators(String type, String title, String body, String postId) {
    List<String> regulators = jdbc.sql("SELECT id FROM users WHERE role = 'regulator' AND is_active = true")
        .query(String.class).list();
    for (String r : regulators) notify(r, type, title, body, postId);
  }

  public Map<String, Object> list(CurrentUser user) {
    List<Map<String, Object>> items = jdbc.sql("""
        SELECT id, type, title, body, post_id, is_read, created_at
        FROM notifications
        WHERE user_id = CAST(:u AS uuid)
        ORDER BY created_at DESC
        LIMIT 50
        """)
        .param("u", user.id())
        .query(DatabaseRowMapper::toMap)
        .list();
    long unread = jdbc.sql("SELECT COUNT(*) FROM notifications WHERE user_id = CAST(:u AS uuid) AND is_read = false")
        .param("u", user.id())
        .query(Long.class).single();
    return Map.of("notifications", items, "unread", unread);
  }

  public Map<String, Object> markAllRead(CurrentUser user) {
    jdbc.sql("UPDATE notifications SET is_read = true WHERE user_id = CAST(:u AS uuid) AND is_read = false")
        .param("u", user.id())
        .update();
    return Map.of("ok", true);
  }
}
