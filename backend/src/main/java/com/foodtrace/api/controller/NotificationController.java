package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.NotificationService;
import com.foodtrace.api.service.PushNotificationService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService notifications;
  private final PushNotificationService pushNotifications;

  public NotificationController(NotificationService notifications, PushNotificationService pushNotifications) {
    this.notifications = notifications;
    this.pushNotifications = pushNotifications;
  }

  @PostMapping("/push-token")
  public Map<String, Object> registerPushToken(@RequestBody Map<String, String> body, Authentication authentication) {
    pushNotifications.registerToken(currentUser(authentication).id(), body.get("token"));
    return Map.of("registered", true);
  }

  @GetMapping
  public Map<String, Object> list(Authentication authentication) {
    return notifications.list(currentUser(authentication));
  }

  @PostMapping("/read")
  public Map<String, Object> markAllRead(Authentication authentication) {
    return notifications.markAllRead(currentUser(authentication));
  }

  private CurrentUser currentUser(Authentication authentication) {
    return (CurrentUser) authentication.getPrincipal();
  }
}
