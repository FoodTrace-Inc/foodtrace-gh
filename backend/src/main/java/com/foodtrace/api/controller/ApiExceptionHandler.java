package com.foodtrace.api.controller;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> responseStatus(ResponseStatusException ex) {
    HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
    String message = ex.getReason() == null || ex.getReason().isBlank()
        ? status.getReasonPhrase()
        : ex.getReason();
    return ResponseEntity.status(status).body(Map.of(
        "status", status.value(),
        "error", message));
  }

  // Bad client input (malformed UUID, missing/blank ids, unparseable body,
  // invalid enum value) should be a clean 400 — not a 500 "Server error".
  @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
  ResponseEntity<Map<String, Object>> badRequest(Exception ex) {
    String detail = String.valueOf(ex.getMessage());
    String message = detail.contains("UUID")
        ? "Invalid or missing id."
        : "Invalid request. Please check the values and try again.";
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400, "error", message));
  }

  // Date fields (planting date, application date, harvest date, etc.) are
  // free-text on the mobile forms with no client-side format check, so
  // LocalDate.parse(...) on a malformed value is a real, reachable client
  // error - it should be a clean 400, not a 500 with a leaked stack detail.
  @ExceptionHandler(java.time.format.DateTimeParseException.class)
  ResponseEntity<Map<String, Object>> badDate(java.time.format.DateTimeParseException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400, "error", "Invalid date. Please use the format YYYY-MM-DD."));
  }

  // A malformed value reaching a typed SQL cast (e.g. CAST(:date AS date))
  // is rejected by Postgres as bad SQL grammar - still a client input
  // problem, not a server bug.
  @ExceptionHandler(org.springframework.dao.InvalidDataAccessResourceUsageException.class)
  ResponseEntity<Map<String, Object>> invalidValue(org.springframework.dao.InvalidDataAccessResourceUsageException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400, "error", "One of the values provided is not valid. Please check your input and try again."));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Map<String, Object>> dataIntegrity(DataIntegrityViolationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "status", 400,
        "error", "That value isn't allowed. Please check your input and try again."));
  }

  // An ownership-checked query (…RETURNING .single()) that matches no row means
  // the item doesn't exist or isn't the caller's — a clean 404, not a 500.
  @ExceptionHandler(org.springframework.dao.EmptyResultDataAccessException.class)
  ResponseEntity<Map<String, Object>> emptyResult(org.springframework.dao.EmptyResultDataAccessException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "status", 404,
        "error", "Not found, or you don't have access to it."));
  }

  // An unknown route must be a clean 404, not a 500 "Server error" — otherwise
  // Spring's NoResourceFoundException falls through to the catch-all below.
  @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
  ResponseEntity<Map<String, Object>> notFound(Exception ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "status", 404,
        "error", "Not found."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> unexpected(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
        "status", 500,
        "error", "Server error",
        "detail", ex.getClass().getSimpleName() + ": " + String.valueOf(ex.getMessage())));
  }
}