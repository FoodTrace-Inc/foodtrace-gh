package com.foodtrace.api.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/** Sends real SMS via the Africa's Talking messaging API. Send failures are logged, never thrown —
 * an SMS delivery problem should never roll back the recall/report that triggered it. */
public class AfricasTalkingSmsSender implements SmsSender {
  private static final Logger log = LoggerFactory.getLogger(AfricasTalkingSmsSender.class);
  private static final String ENDPOINT = "https://api.africastalking.com/version1/messaging";

  private final RestTemplate restTemplate;
  private final String apiKey;
  private final String username;

  public AfricasTalkingSmsSender(RestTemplate restTemplate, String apiKey, String username) {
    this.restTemplate = restTemplate;
    this.apiKey = apiKey;
    this.username = username;
  }

  @Override
  public void send(String phoneNumber, String message) {
    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
      headers.set("apiKey", apiKey);
      headers.set("Accept", "application/json");

      MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
      body.add("username", username);
      body.add("to", phoneNumber);
      body.add("message", message);

      restTemplate.postForEntity(ENDPOINT, new HttpEntity<>(body, headers), String.class);
    } catch (Exception e) {
      log.warn("[sms:africastalking] failed to send to {}: {}", phoneNumber, e.getMessage());
    }
  }
}
