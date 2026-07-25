package com.foodtrace.api.fda;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Lightweight fuzzy matcher for pairing our short branded product names
 * ("Milo 400g Tin") against the FDA registry's verbose, packaging-heavy
 * names ("Nestle Milo All In One Nutri-Mix - The Energy Food Drink
 * (Metalized Laminate-37g, 800g)"). No ML, no extra dependency — just
 * token-set (Jaccard) overlap with a bonus for a shared leading "brand"
 * word, which is what actually distinguishes real matches from noise here.
 */
public final class FdaNameMatcher {
  private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
  private static final Set<String> STOPWORDS = Set.of(
      "the", "and", "for", "with", "ltd", "limited", "company", "co", "gh", "ghana",
      "product", "products", "tin", "pack", "sachet", "bottle", "tablets", "capsules",
      "each", "contains", "pet", "container", "ml", "mg", "kg", "g", "l");

  private FdaNameMatcher() {
  }

  public static Set<String> tokens(String raw) {
    if (raw == null || raw.isBlank()) return Set.of();
    String normalized = NON_ALNUM.matcher(raw.toLowerCase(Locale.ROOT)).replaceAll(" ");
    Set<String> out = new HashSet<>();
    for (String word : normalized.split("\\s+")) {
      if (word.length() >= 3 && !STOPWORDS.contains(word) && !word.matches("\\d+")) {
        out.add(word);
      }
    }
    return out;
  }

  /** Jaccard similarity of the two names' token sets, plus a bonus if either name's leading word appears in the other. */
  public static double score(String ourName, String fdaName) {
    Set<String> a = tokens(ourName);
    Set<String> b = tokens(fdaName);
    if (a.isEmpty() || b.isEmpty()) return 0.0;

    Set<String> intersection = new HashSet<>(a);
    intersection.retainAll(b);
    Set<String> union = new HashSet<>(a);
    union.addAll(b);
    double jaccard = (double) intersection.size() / union.size();

    String firstWordOfOurs = firstToken(ourName);
    double brandBonus = (firstWordOfOurs != null && b.contains(firstWordOfOurs)) ? 0.25 : 0.0;

    return Math.min(1.0, jaccard + brandBonus);
  }

  private static String firstToken(String raw) {
    Set<String> t = tokens(raw);
    if (t.isEmpty()) return null;
    // Sets have no order; recompute from the raw string directly to keep the true first word.
    String normalized = NON_ALNUM.matcher(raw.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    return Arrays.stream(normalized.split("\\s+"))
        .filter(w -> w.length() >= 3 && !STOPWORDS.contains(w) && !w.matches("\\d+"))
        .findFirst()
        .orElse(null);
  }
}
