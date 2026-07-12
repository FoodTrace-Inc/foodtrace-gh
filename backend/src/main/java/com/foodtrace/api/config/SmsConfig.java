package com.foodtrace.api.config;

import com.foodtrace.api.sms.AfricasTalkingSmsSender;
import com.foodtrace.api.sms.LocalSmsSender;
import com.foodtrace.api.sms.SmsSender;
import java.time.Duration;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SmsConfig {
  @Bean
  SmsSender smsSender(AppProperties properties, RestTemplateBuilder builder) {
    String apiKey = properties.africasTalkingApiKey();
    if (apiKey != null && !apiKey.isBlank()) {
      var restTemplate = builder
          .setConnectTimeout(Duration.ofSeconds(5))
          .setReadTimeout(Duration.ofSeconds(5))
          .build();
      String username = properties.africasTalkingUsername() != null && !properties.africasTalkingUsername().isBlank()
          ? properties.africasTalkingUsername() : "sandbox";
      return new AfricasTalkingSmsSender(restTemplate, apiKey, username);
    }
    return new LocalSmsSender();
  }
}
