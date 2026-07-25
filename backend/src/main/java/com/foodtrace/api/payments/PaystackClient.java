package com.foodtrace.api.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodtrace.api.config.AppProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thin wrapper over Paystack's REST API (https://api.paystack.co). Paystack
 * itself is the source of truth for transaction state — this client only
 * initiates/verifies; PaymentService reconciles the result into our own
 * payments/subscriptions tables.
 */
@Component
public class PaystackClient {
  private static final String BASE_URL = "https://api.paystack.co";

  private final HttpClient httpClient;
  private final ObjectMapper mapper = new ObjectMapper();
  private final AppProperties appProperties;

  public PaystackClient(AppProperties appProperties) {
    this.appProperties = appProperties;
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
  }

  public boolean isConfigured() {
    return appProperties.paystackSecretKey() != null && !appProperties.paystackSecretKey().isBlank();
  }

  private void requireConfigured() {
    if (!isConfigured()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Payments are not configured. Set PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY.");
    }
  }

  /** POST /transaction/initialize — amount is in the major unit (GHS), converted to pesewas here. */
  public JsonNode initializeTransaction(String email, java.math.BigDecimal amountGhs, String reference, Map<String, Object> metadata) {
    requireConfigured();
    long amountInKobo = amountGhs.multiply(java.math.BigDecimal.valueOf(100)).longValueExact();
    Map<String, Object> body = Map.of(
        "email", email,
        "amount", amountInKobo,
        "currency", "GHS",
        "reference", reference,
        "metadata", metadata);
    return post("/transaction/initialize", body);
  }

  /** GET /transaction/verify/{reference} */
  public JsonNode verifyTransaction(String reference) {
    requireConfigured();
    return get("/transaction/verify/" + reference);
  }

  private JsonNode post(String path, Map<String, Object> body) {
    try {
      String json = mapper.writeValueAsString(body);
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(BASE_URL + path))
          .header("Authorization", "Bearer " + appProperties.paystackSecretKey())
          .header("Content-Type", "application/json")
          .timeout(Duration.ofSeconds(20))
          .POST(HttpRequest.BodyPublishers.ofString(json))
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      return parseOrThrow(response);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Paystack: " + e.getMessage());
    }
  }

  private JsonNode get(String path) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(BASE_URL + path))
          .header("Authorization", "Bearer " + appProperties.paystackSecretKey())
          .timeout(Duration.ofSeconds(20))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      return parseOrThrow(response);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Paystack: " + e.getMessage());
    }
  }

  private JsonNode parseOrThrow(HttpResponse<String> response) throws Exception {
    JsonNode root = mapper.readTree(response.body());
    boolean status = root.path("status").asBoolean(false);
    if (!status) {
      String message = root.path("message").asText("Paystack request failed");
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
    return root.path("data");
  }
}
