package com.foodtrace.api.controller;

import com.foodtrace.api.service.UssdService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Africa's Talking USSD webhook. AT posts application/x-www-form-urlencoded fields
 * (sessionId, serviceCode, phoneNumber, text) and expects a text/plain body starting
 * with "CON " (menu continues, more input expected) or "END " (session terminates).
 * Point the AT USSD callback at {@code <public-url>/api/ussd}.
 */
@RestController
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
