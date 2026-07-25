package com.foodtrace.api.payments;

import com.foodtrace.api.service.EmailService;
import com.foodtrace.api.service.NotificationService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Step 5: daily job that sends the 7-day and 1-day subscription-expiry
 * warnings. Runs once a day at 08:00 — no need for anything finer-grained
 * for a reminder that's only meaningful once a day. Each reminder is
 * marked sent (reminder_7d_sent_for / reminder_1d_sent_for = that
 * expires_at) so a renewal naturally re-arms both reminders without any
 * extra reset logic.
 */
@Service
public class SubscriptionExpiryNotifier {
  private static final Logger log = LoggerFactory.getLogger(SubscriptionExpiryNotifier.class);

  private final JdbcClient jdbc;
  private final NotificationService notificationService;
  private final EmailService emailService;

  public SubscriptionExpiryNotifier(JdbcClient jdbc, NotificationService notificationService, EmailService emailService) {
    this.jdbc = jdbc;
    this.notificationService = notificationService;
    this.emailService = emailService;
  }

  @Scheduled(cron = "0 0 8 * * *")
  public void runDailyCheck() {
    int sevenDay = sendRemindersDueIn(7, "reminder_7d_sent_for",
        "Your subscription expires in 7 days. Renew to keep your products listed.");
    int oneDay = sendRemindersDueIn(1, "reminder_1d_sent_for",
        "Your subscription expires tomorrow. Renew now to avoid interruption.");
    log.info("Subscription expiry check: {} seven-day reminders, {} one-day reminders sent.", sevenDay, oneDay);
  }

  private int sendRemindersDueIn(int daysOut, String reminderColumn, String messageBody) {
    // reminderColumn is always one of two hardcoded literals passed by this
    // class itself (never user input) — safe to splice into the query text.
    String sql = """
        SELECT s.user_id, s.plan_type, s.expires_at, u.email
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        WHERE s.status = 'active'
          AND s.expires_at::date = (CURRENT_DATE + :daysOut)
          AND s.%s IS DISTINCT FROM s.expires_at
        """.formatted(reminderColumn);

    List<Map<String, Object>> due = jdbc.sql(sql)
        .param("daysOut", daysOut)
        .query((rs, rn) -> Map.<String, Object>of(
            "userId", rs.getString("user_id"),
            "planType", rs.getString("plan_type"),
            "expiresAt", rs.getObject("expires_at", OffsetDateTime.class),
            "email", rs.getString("email")))
        .list();

    for (Map<String, Object> row : due) {
      String userId = (String) row.get("userId");
      String email = (String) row.get("email");
      OffsetDateTime expiresAt = (OffsetDateTime) row.get("expiresAt");

      notificationService.notify(userId, "subscription_expiring", "Subscription expiring soon", messageBody, null);
      emailService.send(email, "Your FoodTrace GH subscription is expiring soon", messageBody + "\n\n— FoodTrace GH");

      jdbc.sql("UPDATE subscriptions SET %s = :expiresAt WHERE user_id = CAST(:uid AS uuid)".formatted(reminderColumn))
          .param("expiresAt", expiresAt)
          .param("uid", userId)
          .update();
    }
    return due.size();
  }
}
