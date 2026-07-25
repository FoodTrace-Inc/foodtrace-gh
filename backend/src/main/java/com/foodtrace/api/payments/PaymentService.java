package com.foodtrace.api.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodtrace.api.config.AppProperties;
import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.EmailService;
import com.foodtrace.api.service.NotificationService;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {
  /** GHS price for each plan — matches the pricing table in the spec. Premium is the consumer plan; the rest are manufacturer/pharmacist tiers. */
  private static final Map<String, BigDecimal> PLAN_PRICES = Map.of(
      "micro", new BigDecimal("50"),
      "small", new BigDecimal("150"),
      "medium", new BigDecimal("400"),
      "large", new BigDecimal("1000"),
      "premium", new BigDecimal("10"));

  private final JdbcClient jdbc;
  private final PaystackClient paystackClient;
  private final AppProperties appProperties;
  private final NotificationService notificationService;
  private final EmailService emailService;
  private final ObjectMapper mapper = new ObjectMapper();

  public PaymentService(JdbcClient jdbc, PaystackClient paystackClient, AppProperties appProperties,
      NotificationService notificationService, EmailService emailService) {
    this.jdbc = jdbc;
    this.paystackClient = paystackClient;
    this.appProperties = appProperties;
    this.notificationService = notificationService;
    this.emailService = emailService;
  }

  /** Mobile flow: server drives Paystack's hosted checkout (authorization_url), opened in an in-app browser. */
  public Map<String, Object> initialize(CurrentUser user, Map<String, Object> body) {
    PendingPayment pending = createPendingPayment(user, body);
    JsonNode data = paystackClient.initializeTransaction(pending.email(), pending.price(), pending.reference(),
        Map.of("userId", user.id(), "planType", pending.planType()));

    return Map.of(
        "authorizationUrl", data.path("authorization_url").asText(),
        "reference", data.path("reference").asText(pending.reference()));
  }

  /**
   * Web flow: the browser drives Paystack's inline popup (PaystackPop.setup)
   * directly with the public key — we never touch Paystack's API here,
   * just reserve our own ledger row + reference so /verify has something to
   * reconcile against once the popup reports success.
   */
  public Map<String, Object> initializeInline(CurrentUser user, Map<String, Object> body) {
    PendingPayment pending = createPendingPayment(user, body);
    return Map.of(
        "reference", pending.reference(),
        "email", pending.email(),
        "amountGhs", pending.price(),
        "amountKobo", pending.price().multiply(BigDecimal.valueOf(100)).longValueExact());
  }

  private record PendingPayment(String reference, String email, BigDecimal price, String planType) {}

  private PendingPayment createPendingPayment(CurrentUser user, Map<String, Object> body) {
    String planType = String.valueOf(body.get("planType"));
    BigDecimal price = PLAN_PRICES.get(planType);
    if (price == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "planType must be one of " + PLAN_PRICES.keySet());
    }

    String email = body.get("email") != null ? String.valueOf(body.get("email")) : lookupEmail(user.id());
    if (email == null || email.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An email is required to initialize payment.");
    }

    String reference = "FT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();

    jdbc.sql("""
        INSERT INTO payments (user_id, reference, amount, currency, plan_type, status)
        VALUES (CAST(:userId AS uuid), :reference, :amount, 'GHS', CAST(:planType AS subscription_tier), 'pending')
        """)
        .param("userId", user.id())
        .param("reference", reference)
        .param("amount", price)
        .param("planType", planType)
        .update();

    return new PendingPayment(reference, email, price, planType);
  }

  public Map<String, Object> verify(String reference) {
    JsonNode data = paystackClient.verifyTransaction(reference);
    String status = data.path("status").asText(); // "success" | "failed" | "abandoned"
    String channel = data.path("channel").asText(null);
    boolean success = "success".equals(status);

    Map<String, Object> payment = jdbc.sql("SELECT user_id, plan_type FROM payments WHERE reference = :ref")
        .param("ref", reference)
        .query((rs, rn) -> Map.<String, Object>of("userId", rs.getString("user_id"), "planType", rs.getString("plan_type")))
        .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown payment reference"));

    reconcile(reference, success ? "success" : "failed", channel, (String) payment.get("userId"), (String) payment.get("planType"));

    return Map.of(
        "status", success ? "success" : "failed",
        "amount", data.path("amount").asLong(0) / 100.0,
        "paidAt", data.path("paid_at").asText(""),
        "channel", channel == null ? "" : channel);
  }

  /** Idempotent: safe to call from both the verify endpoint and the webhook for the same reference. */
  private void reconcile(String reference, String status, String channel, String userId, String planType) {
    OffsetDateTime now = OffsetDateTime.now();
    OffsetDateTime expiresAt = now.plusMonths(1);

    int updated = jdbc.sql("""
        UPDATE payments SET status = CAST(:status AS payment_status), channel = :channel,
               paid_at = CASE WHEN :status = 'success' THEN :now ELSE paid_at END,
               expires_at = CASE WHEN :status = 'success' THEN :expiresAt ELSE expires_at END
        WHERE reference = :reference AND status <> 'success'
        """)
        .param("status", status)
        .param("channel", channel)
        .param("now", now)
        .param("expiresAt", expiresAt)
        .param("reference", reference)
        .update();

    if (!"success".equals(status)) {
      if (updated > 0) {
        notificationService.notify(userId, "payment_failed", "Payment failed",
            "Your payment failed. Please update your payment method.", null);
        emailService.send(lookupEmail(userId), "Your FoodTrace GH payment failed",
            "Your payment failed. Please update your payment method and try again.\n\n— FoodTrace GH");
      }
      return;
    }

    // Payment already reconciled by an earlier call (verify then webhook, or vice versa) — skip re-activation.
    if (updated == 0) return;

    jdbc.sql("""
        INSERT INTO subscriptions (user_id, plan_type, status, started_at, expires_at, auto_renew)
        VALUES (CAST(:userId AS uuid), CAST(:planType AS subscription_tier), 'active', :now, :expiresAt, true)
        ON CONFLICT (user_id) DO UPDATE SET
          plan_type = EXCLUDED.plan_type, status = 'active', started_at = :now,
          expires_at = :expiresAt, updated_at = :now
        """)
        .param("userId", userId)
        .param("planType", planType)
        .param("now", now)
        .param("expiresAt", expiresAt)
        .update();

    notificationService.notify(userId, "payment_success", "Subscription activated",
        "Your " + planType + " subscription is now active. Thank you!", null);
    emailService.send(lookupEmail(userId), "Your FoodTrace GH subscription is active",
        "Your " + planType + " subscription is now active. Thank you for subscribing!\n\n"
            + "Renews on " + expiresAt.toLocalDate() + ".\n\n— FoodTrace GH");
  }

  public Map<String, Object> handleWebhook(String rawBody, String signature) {
    if (!verifySignature(rawBody, signature)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Paystack signature");
    }
    try {
      JsonNode event = mapper.readTree(rawBody);
      String eventType = event.path("event").asText();
      JsonNode data = event.path("data");
      String reference = data.path("reference").asText(null);

      switch (eventType) {
        case "charge.success" -> {
          if (reference != null) {
            Map<String, Object> payment = jdbc.sql("SELECT user_id, plan_type FROM payments WHERE reference = :ref")
                .param("ref", reference)
                .query((rs, rn) -> Map.<String, Object>of("userId", rs.getString("user_id"), "planType", rs.getString("plan_type")))
                .optional().orElse(null);
            if (payment != null) {
              reconcile(reference, "success", data.path("channel").asText(null), (String) payment.get("userId"), (String) payment.get("planType"));
            }
          }
        }
        case "subscription.disable" -> {
          String userId = data.path("customer").path("metadata").path("userId").asText(null);
          if (userId != null) {
            jdbc.sql("UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE user_id = CAST(:uid AS uuid)")
                .param("uid", userId).update();
            notificationService.notify(userId, "subscription_cancelled", "Subscription cancelled",
                "Your subscription has been cancelled.", null);
            emailService.send(lookupEmail(userId), "Your FoodTrace GH subscription was cancelled",
                "Your subscription has been cancelled.\n\n— FoodTrace GH");
          }
        }
        case "invoice.payment_failed" -> {
          String userId = data.path("customer").path("metadata").path("userId").asText(null);
          if (userId != null) {
            notificationService.notify(userId, "payment_failed", "Payment failed",
                "Your payment failed. Please update your payment method.", null);
            emailService.send(lookupEmail(userId), "Your FoodTrace GH payment failed",
                "Your payment failed. Please update your payment method.\n\n— FoodTrace GH");
          }
        }
        default -> { /* ignore events we don't act on */ }
      }
      return Map.of("received", true);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not process webhook: " + e.getMessage());
    }
  }

  private boolean verifySignature(String rawBody, String signature) {
    if (signature == null || !paystackClient.isConfigured()) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA512");
      mac.init(new SecretKeySpec(appProperties.paystackSecretKey().getBytes(), "HmacSHA512"));
      byte[] hash = mac.doFinal(rawBody.getBytes());
      String computed = HexFormat.of().formatHex(hash);
      return MessageDigest.isEqual(computed.getBytes(), signature.getBytes());
    } catch (Exception e) {
      return false;
    }
  }

  public Map<String, Object> subscriptionStatus(String userId) {
    Map<String, Object> sub = jdbc.sql("""
        SELECT plan_type, status, expires_at FROM subscriptions WHERE user_id = CAST(:uid AS uuid)
        """)
        .param("uid", userId)
        .query((rs, rn) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("plan", rs.getString("plan_type"));
          OffsetDateTime expiresAt = rs.getObject("expires_at", OffsetDateTime.class);
          boolean expired = expiresAt.isBefore(OffsetDateTime.now());
          m.put("status", expired ? "expired" : rs.getString("status"));
          m.put("expiryDate", expiresAt.toLocalDate().toString());
          m.put("daysLeft", Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), expiresAt.toLocalDate())));
          return m;
        })
        .optional().orElse(null);

    if (sub == null) {
      return Map.of("plan", "none", "status", "none", "expiryDate", "", "daysLeft", 0);
    }
    return sub;
  }

  public Map<String, Object> cancel(String userId) {
    OffsetDateTime expiresAt = jdbc.sql("SELECT expires_at FROM subscriptions WHERE user_id = CAST(:uid AS uuid)")
        .param("uid", userId).query(OffsetDateTime.class).optional().orElse(null);

    int updated = jdbc.sql("UPDATE subscriptions SET status = 'cancelled', auto_renew = false, updated_at = now() WHERE user_id = CAST(:uid AS uuid)")
        .param("uid", userId)
        .update();
    if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No subscription to cancel");

    String expiryText = expiresAt != null ? expiresAt.toLocalDate().toString() : "your next renewal date";
    notificationService.notify(userId, "subscription_cancelled", "Subscription cancelled",
        "Your subscription has been cancelled. Your products will be hidden on " + expiryText + ".", null);
    emailService.send(lookupEmail(userId), "Your FoodTrace GH subscription was cancelled",
        "Your subscription has been cancelled. Your products will be hidden on " + expiryText + ".\n\n— FoodTrace GH");
    return Map.of("cancelled", true);
  }

  public Map<String, Object> paymentHistory(String userId) {
    List<Map<String, Object>> rows = jdbc.sql("""
        SELECT reference, amount, currency, plan_type, status, channel, paid_at, created_at
        FROM payments WHERE user_id = CAST(:uid AS uuid) ORDER BY created_at DESC LIMIT 50
        """)
        .param("uid", userId)
        .query((rs, rn) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("reference", rs.getString("reference"));
          m.put("amount", rs.getBigDecimal("amount"));
          m.put("currency", rs.getString("currency"));
          m.put("planType", rs.getString("plan_type"));
          m.put("status", rs.getString("status"));
          m.put("channel", rs.getString("channel"));
          m.put("paidAt", rs.getObject("paid_at", OffsetDateTime.class));
          m.put("createdAt", rs.getObject("created_at", OffsetDateTime.class));
          return m;
        })
        .list();
    return Map.of("payments", rows);
  }

  private String lookupEmail(String userId) {
    return jdbc.sql("SELECT email FROM users WHERE id = CAST(:uid AS uuid)")
        .param("uid", userId)
        .query(String.class)
        .optional().orElse(null);
  }
}
