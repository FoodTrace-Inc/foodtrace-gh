package com.foodtrace.api.controller;

import com.foodtrace.api.payments.PaymentService;
import com.foodtrace.api.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping("/initialize")
  public Map<String, Object> initialize(@RequestBody Map<String, Object> body, Authentication authentication) {
    return paymentService.initialize(currentUser(authentication), body);
  }

  @GetMapping("/verify/{reference}")
  public Map<String, Object> verify(@PathVariable String reference) {
    return paymentService.verify(reference);
  }

  /**
   * Paystack calls this directly (no JWT — see SecurityConfig's public
   * filter chain) and signs the raw body with HMAC SHA512 using the secret
   * key, sent in the x-paystack-signature header. We read the raw body via
   * HttpServletRequest rather than @RequestBody because the signature is
   * computed over the exact bytes sent, not a re-serialized object.
   */
  @PostMapping("/webhook")
  public Map<String, Object> webhook(HttpServletRequest request, @RequestHeader("x-paystack-signature") String signature) throws Exception {
    String rawBody = new String(request.getInputStream().readAllBytes());
    return paymentService.handleWebhook(rawBody, signature);
  }

  @GetMapping("/subscription/{userId}")
  public Map<String, Object> subscriptionStatus(@PathVariable String userId) {
    return paymentService.subscriptionStatus(userId);
  }

  @PostMapping("/subscription/cancel")
  public Map<String, Object> cancelSubscription(@RequestBody Map<String, Object> body) {
    return paymentService.cancel(String.valueOf(body.get("userId")));
  }

  @GetMapping("/history")
  public Map<String, Object> history(Authentication authentication) {
    return paymentService.paymentHistory(currentUser(authentication).id());
  }

  private CurrentUser currentUser(Authentication authentication) {
    return (CurrentUser) authentication.getPrincipal();
  }
}
