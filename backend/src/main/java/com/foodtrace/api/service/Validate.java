package com.foodtrace.api.service;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class Validate {
  private Validate() {}

  static void require(Map<String, Object> body, String... keys) {
    for (String key : keys) {
      Object value = body.get(key);
      if (value == null || value.toString().isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: " + key);
      }
    }
  }

  static void requirePositiveInt(Map<String, Object> body, String key) {
    Object value = body.get(key);
    if (value == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: " + key);
    }
    try {
      int n = Integer.parseInt(value.toString());
      if (n <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be a positive number");
    } catch (NumberFormatException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be a number");
    }
  }
}
