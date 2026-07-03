package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.NotificationService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService notifications;

  public NotificationController(NotificationService notifications) {
    this.notifications = notifications;
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
