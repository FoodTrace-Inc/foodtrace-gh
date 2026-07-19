package com.foodtrace.api.controller;

import com.foodtrace.api.service.UssdService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

  public UssdController(UssdService ussdService) {
    this.ussdService = ussdService;
  }

  @PostMapping(value = "/api/ussd", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
  public String handle(
      @RequestParam(required = false) String sessionId,
      @RequestParam(required = false) String serviceCode,
      @RequestParam(required = false) String phoneNumber,
      @RequestParam(required = false) String text) {
    return ussdService.handle(phoneNumber, text);
  }
}
