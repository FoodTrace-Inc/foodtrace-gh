package com.foodtrace.api.service;

import com.foodtrace.api.dto.ApiDtos.SecurityQuestionOption;
import java.util.List;
import java.util.Map;

/**
 * The fixed set of security questions users may pick from at registration —
 * free-text questions would let users write easily-guessable ones, so the
 * choice is limited to this vetted list.
 */
public final class SecurityQuestionCatalog {
  private SecurityQuestionCatalog() {
  }

  public static final List<SecurityQuestionOption> QUESTIONS = List.of(
      new SecurityQuestionOption("Q1", "What was the full name of your first primary school teacher?"),
      new SecurityQuestionOption("Q2", "What was the street name of the house you grew up in?"),
      new SecurityQuestionOption("Q3", "What was your maternal grandmother's first name?"),
      new SecurityQuestionOption("Q4", "What was the name of your first Senior High School house?"),
      new SecurityQuestionOption("Q5", "What was the name of the first person you sent mobile money to?"),
      new SecurityQuestionOption("Q6", "What was the name of the hospital you were born in?"));

  private static final Map<String, String> BY_ID = QUESTIONS.stream()
      .collect(java.util.stream.Collectors.toMap(SecurityQuestionOption::id, SecurityQuestionOption::text));

  /** Resolves a question id (e.g. "Q3") to its display text, or null if unrecognized. */
  public static String textFor(String id) {
    return id == null ? null : BY_ID.get(id.trim().toUpperCase());
  }

  public static boolean isValidId(String id) {
    return id != null && BY_ID.containsKey(id.trim().toUpperCase());
  }
}
