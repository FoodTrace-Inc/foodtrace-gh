package com.foodtrace.api.service;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Sends real OS-level push notifications via Expo's push API — the same
 * mechanism Expo Go and EAS-built apps use, no Firebase/APNs setup needed.
 * Registered tokens live in push_tokens; NotificationService calls this
 * after every in-app notification so a push follows automatically.
 */
@Service
public class PushNotificationService {
  private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
  private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

  private final JdbcClient jdbc;
  private final RestClient restClient = RestClient.create();

  public PushNotificationService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public void registerToken(String userId, String token) {
    if (token == null || token.isBlank()) return;
    jdbc.sql("""
        INSERT INTO push_tokens (user_id, token) VALUES (CAST(:u AS uuid), :t)
        ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id
        """)
        .param("u", userId)
        .param("t", token.trim())
        .update();
  }

  public void sendToUser(String userId, String title, String body) {
    if (userId == null) return;
    List<String> tokens = jdbc.sql("SELECT token FROM push_tokens WHERE user_id = CAST(:u AS uuid)")
        .param("u", userId)
        .query(String.class)
        .list();
    for (String token : tokens) {
      send(token, title, body);
    }
  }

  private void send(String token, String title, String body) {
    try {
      restClient.post()
          .uri(EXPO_PUSH_URL)
          .header("Content-Type", "application/json")
          .header("Accept", "application/json")
          .body(Map.of("to", token, "title", title, "body", body, "sound", "default"))
          .retrieve()
          .toBodilessEntity();
    } catch (Exception error) {
      log.warn("Push send failed for token {}: {}", token, error.getMessage());
    }
  }
}
