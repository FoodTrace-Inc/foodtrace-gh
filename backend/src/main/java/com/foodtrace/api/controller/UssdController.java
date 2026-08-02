package com.foodtrace.api.controller;

import com.foodtrace.api.service.UssdService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Legacy Africa's Talking USSD webhook on the Core API.
 * <p>
 * Disabled by default so the Analytics microservice owns {@code POST /api/ussd}
 * (see docs/MICROSERVICES.md). Set {@code foodtrace.ussd.enabled=true} (or
 * env {@code USSD_ENABLED=true}) only for local legacy tests.
 */
@RestController
@ConditionalOnProperty(prefix = "foodtrace.ussd", name = "enabled", havingValue = "true")
public class UssdController {
  private final UssdService ussdService;
  private final String sharedSecret;

  public UssdController(UssdService ussdService, @Value("${USSD_SHARED_SECRET:}") String sharedSecret) {
    this.ussdService = ussdService;
    this.sharedSecret = sharedSecret;
  }

  @PostMapping(value = "/api/ussd", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
  public String handle(
      @RequestHeader(value = "X-Ussd-Secret", required = false) String secret,
      @RequestParam(required = false) String sessionId,
      @RequestParam(required = false) String serviceCode,
      @RequestParam(required = false) String phoneNumber,
      @RequestParam(required = false) String text) {
    // This endpoint identifies the caller purely by a client-supplied
    // phoneNumber - with no gateway auth, anyone could POST any registered
    // user's number and act as them. Since the endpoint is opt-in (disabled
    // by default), require a shared secret to be configured before it will
    // serve any request at all, rather than silently trusting the caller.
    if (sharedSecret.isBlank() || !sharedSecret.equals(secret)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing USSD gateway secret");
    }
    return ussdService.handle(phoneNumber, text);
  }
}
