package com.foodtrace.api.payments;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Central place for every subscription-limit check (Step 4). Farmers and
 * regulators never call any of these — they have full free access by
 * design (see the spec). Manufacturers/pharmacists need an active
 * subscription to create products/batches, capped by tier. Consumers get
 * 20 free scans/month unless they're on the premium plan.
 */
@Service
public class SubscriptionLimitService {
  private static final Map<String, Integer> TIER_PRODUCT_LIMITS = Map.of(
      "micro", 10, "small", 50, "medium", 200, "large", Integer.MAX_VALUE);
  private static final int FREE_SCANS_PER_MONTH = 20;

  private final JdbcClient jdbc;

  public SubscriptionLimitService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Throws 402 if the seller has no active subscription, or is at/over their tier's product limit. */
  public void enforceSellerLimit(String userId, long currentProductCount) {
    ActiveSubscription sub = activeSubscription(userId);
    if (sub == null) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Subscribe to start listing your products.");
    }
    int limit = TIER_PRODUCT_LIMITS.getOrDefault(sub.planType(), 0);
    if (currentProductCount >= limit) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
          "You've reached your " + sub.planType() + " plan's limit of " + limit + " products. Upgrade to add more.");
    }
  }

  /** No-op for non-consumers or premium consumers. Throws 402 once the free monthly quota is used. */
  public void enforceConsumerScanLimit(String userId) {
    if (userId == null || !"consumer".equals(role(userId))) return;

    ActiveSubscription sub = activeSubscription(userId);
    if (sub != null && "premium".equals(sub.planType())) return;

    LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
    Integer count = jdbc.sql("""
        SELECT scan_count FROM consumer_scan_usage
        WHERE user_id = CAST(:uid AS uuid) AND period_start = :period
        """)
        .param("uid", userId)
        .param("period", periodStart)
        .query(Integer.class)
        .optional().orElse(0);

    if (count >= FREE_SCANS_PER_MONTH) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
          "You have used all 20 free scans this month. Upgrade to Premium for GHS 10/month to scan unlimited products.");
    }
  }

  /** Call after a successful scan by a logged-in consumer. Resets the counter automatically when the month rolls over. */
  public void recordConsumerScan(String userId) {
    if (userId == null || !"consumer".equals(role(userId))) return;
    LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
    jdbc.sql("""
        INSERT INTO consumer_scan_usage (user_id, period_start, scan_count)
        VALUES (CAST(:uid AS uuid), :period, 1)
        ON CONFLICT (user_id) DO UPDATE SET
          scan_count = CASE WHEN consumer_scan_usage.period_start = :period
                            THEN consumer_scan_usage.scan_count + 1 ELSE 1 END,
          period_start = :period
        """)
        .param("uid", userId)
        .param("period", periodStart)
        .update();
  }

  private String role(String userId) {
    return jdbc.sql("SELECT role FROM users WHERE id = CAST(:uid AS uuid)")
        .param("uid", userId)
        .query(String.class)
        .optional().orElse(null);
  }

  private record ActiveSubscription(String planType, OffsetDateTime expiresAt) {}

  private ActiveSubscription activeSubscription(String userId) {
    if (userId == null) return null;
    ActiveSubscription row = jdbc.sql("""
        SELECT plan_type, expires_at FROM subscriptions
        WHERE user_id = CAST(:uid AS uuid) AND status = 'active'
        """)
        .param("uid", userId)
        .query((rs, rn) -> new ActiveSubscription(rs.getString("plan_type"), rs.getObject("expires_at", OffsetDateTime.class)))
        .optional().orElse(null);
    if (row == null || row.expiresAt().isBefore(OffsetDateTime.now())) return null;
    return row;
  }
}
