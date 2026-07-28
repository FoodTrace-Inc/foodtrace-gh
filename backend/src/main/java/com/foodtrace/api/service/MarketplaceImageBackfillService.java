package com.foodtrace.api.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * One-time backfill: gives real marketplace demo posts their own distinct
 * photo sourced from Wikipedia's REST summary API by exact page name (never
 * a free-text image search), matched against the post title by keyword.
 * Every candidate image is checked for uniqueness against every other
 * marketplace_posts.image_url before saving - a page whose thumbnail is
 * already in use anywhere is skipped rather than creating a new duplicate.
 */
@Service
public class MarketplaceImageBackfillService {
  private static final Logger log = LoggerFactory.getLogger(MarketplaceImageBackfillService.class);

  // Longest/most-specific keys should be checked first so e.g. "tomato paste"
  // doesn't match the "tomato" farm-produce entry.
  private static final Map<String, String> WIKI_PAGES = new LinkedHashMap<>();
  static {
    // Farm produce
    WIKI_PAGES.put("garden egg", "Eggplant");
    WIKI_PAGES.put("white yam", "Yam_(vegetable)");
    WIKI_PAGES.put("cassava", "Cassava");
    WIKI_PAGES.put("maize", "Maize");
    WIKI_PAGES.put("corn", "Maize");
    WIKI_PAGES.put("plantain", "Cooking_banana");
    WIKI_PAGES.put("cocoa bean", "Cocoa_bean");
    WIKI_PAGES.put("groundnut", "Peanut");
    WIKI_PAGES.put("sweet potato", "Sweet_potato");
    WIKI_PAGES.put("kontomire", "Taro");
    WIKI_PAGES.put("okro", "Okra");
    WIKI_PAGES.put("okra", "Okra");
    WIKI_PAGES.put("fresh pepper", "Chili_pepper");
    WIKI_PAGES.put("chilli", "Chili_pepper");
    WIKI_PAGES.put("onion", "Onion");
    WIKI_PAGES.put("fresh ginger", "Ginger");
    WIKI_PAGES.put("watermelon", "Watermelon");
    WIKI_PAGES.put("pineapple", "Pineapple");
    WIKI_PAGES.put("mango", "Mango");
    WIKI_PAGES.put("pawpaw", "Papaya");
    WIKI_PAGES.put("papaya", "Papaya");
    WIKI_PAGES.put("coconut", "Coconut");
    WIKI_PAGES.put("banana", "Banana");
    WIKI_PAGES.put("cowpea", "Cowpea");
    WIKI_PAGES.put("soybean", "Soybean");
    WIKI_PAGES.put("rice", "Rice");
    WIKI_PAGES.put("shea butter", "Shea_butter");
    WIKI_PAGES.put("tiger nut", "Cyperus_esculentus");
    WIKI_PAGES.put("fresh tomato", "Tomato");
    WIKI_PAGES.put("fresh beans", "Cowpea");

    // Drugs (checked before generic food terms since titles carry dosage strings)
    WIKI_PAGES.put("artemether", "Artemether/lumefantrine");
    WIKI_PAGES.put("cotrimoxazole", "Co-trimoxazole");
    WIKI_PAGES.put("ciprofloxacin", "Ciprofloxacin");
    WIKI_PAGES.put("ibuprofen", "Ibuprofen");
    WIKI_PAGES.put("omeprazole", "Omeprazole");
    WIKI_PAGES.put("chloroquine", "Chloroquine");
    WIKI_PAGES.put("azithromycin", "Azithromycin");
    WIKI_PAGES.put("doxycycline", "Doxycycline");
    WIKI_PAGES.put("fluconazole", "Fluconazole");
    WIKI_PAGES.put("amlodipine", "Amlodipine");
    WIKI_PAGES.put("metformin", "Metformin");
    WIKI_PAGES.put("atorvastatin", "Atorvastatin");
    WIKI_PAGES.put("diclofenac", "Diclofenac");
    WIKI_PAGES.put("folic acid", "Folic_acid");
    WIKI_PAGES.put("vitamin c", "Vitamin_C");
    WIKI_PAGES.put("zinc sulphate", "Zinc_sulfate");
    WIKI_PAGES.put("zinc sulfate", "Zinc_sulfate");
    WIKI_PAGES.put("ors", "Oral_rehydration_therapy");
    WIKI_PAGES.put("mebendazole", "Mebendazole");
    WIKI_PAGES.put("clotrimazole", "Clotrimazole");
    WIKI_PAGES.put("hydrocortisone", "Hydrocortisone");
    WIKI_PAGES.put("gentamicin", "Gentamicin");
    WIKI_PAGES.put("salbutamol", "Salbutamol");
    WIKI_PAGES.put("prednisolone", "Prednisolone");
    WIKI_PAGES.put("tramadol", "Tramadol");
    WIKI_PAGES.put("loratadine", "Loratadine");
    WIKI_PAGES.put("multivitamin", "Multivitamin");
    WIKI_PAGES.put("iron and folic", "Iron_supplement");
    WIKI_PAGES.put("calcium carbonate", "Calcium_carbonate");
    WIKI_PAGES.put("tetracycline", "Tetracycline");
    WIKI_PAGES.put("erythromycin", "Erythromycin");
    WIKI_PAGES.put("quinine", "Quinine");
    WIKI_PAGES.put("albendazole", "Albendazole");
    WIKI_PAGES.put("amoxicillin", "Amoxicillin");
    WIKI_PAGES.put("paracetamol", "Paracetamol");
    WIKI_PAGES.put("artesunate", "Artesunate");

    // Packaged food/drink
    WIKI_PAGES.put("sobolo", "Hibiscus_tea");
    WIKI_PAGES.put("milo", "Milo_(drink)");
    WIKI_PAGES.put("indomie", "Indomie");
    WIKI_PAGES.put("voltic", "Bottled_water");
    WIKI_PAGES.put("alvaro", "Pineapple_juice");
    WIKI_PAGES.put("shandy", "Shandy");
    WIKI_PAGES.put("hausa koko", "Hausa_koko");
    WIKI_PAGES.put("shito", "Shito");
    WIKI_PAGES.put("palm oil", "Palm_oil");
    WIKI_PAGES.put("kalyppo", "Fruit_juice");
    WIKI_PAGES.put("fanta", "Fanta");
    WIKI_PAGES.put("coca-cola", "Coca-Cola");
    WIKI_PAGES.put("coca cola", "Coca-Cola");
    WIKI_PAGES.put("sardine", "Sardine");
    WIKI_PAGES.put("tom brown", "Porridge");
    WIKI_PAGES.put("evaporated milk", "Evaporated_milk");
    WIKI_PAGES.put("vegetable oil", "Vegetable_oil");
    WIKI_PAGES.put("tomato paste", "Tomato_paste");
    WIKI_PAGES.put("nescafe", "Instant_coffee");
    WIKI_PAGES.put("lipton", "Lipton");
    WIKI_PAGES.put("peak", "Powdered_milk");
    WIKI_PAGES.put("margarine", "Margarine");
    WIKI_PAGES.put("groundnut paste", "Peanut_butter");
    WIKI_PAGES.put("honey", "Honey");
    WIKI_PAGES.put("malta", "Malta_(soft_drink)");
    WIKI_PAGES.put("yoghurt", "Yogurt");
    WIKI_PAGES.put("yogurt", "Yogurt");
    WIKI_PAGES.put("chocolate", "Chocolate_bar");
    WIKI_PAGES.put("supermalt", "Malta_(soft_drink)");
  }

  private final JdbcClient jdbc;
  private final WikipediaImageClient wikipedia;

  public MarketplaceImageBackfillService(JdbcClient jdbc, WikipediaImageClient wikipedia) {
    this.jdbc = jdbc;
    this.wikipedia = wikipedia;
  }

  /** Runs the whole backfill synchronously and returns a per-post result summary. */
  public Map<String, Object> run() {
    List<Map<String, Object>> posts = jdbc.sql("SELECT id, title, image_url FROM marketplace_posts")
        .query(DatabaseRowMapper::toMap)
        .list();

    int updated = 0;
    int skippedHasImage = 0;
    int skippedNoMatch = 0;
    int skippedNoThumbnail = 0;
    int skippedDuplicate = 0;
    Map<String, Object> details = new LinkedHashMap<>();

    for (Map<String, Object> post : posts) {
      String id = String.valueOf(post.get("id"));
      String title = String.valueOf(post.get("title"));
      Object existingImage = post.get("imageUrl");

      if (existingImage != null && !String.valueOf(existingImage).isBlank()) {
        skippedHasImage++;
        continue;
      }

      String wikiPage = matchWikiPage(title);
      if (wikiPage == null) {
        skippedNoMatch++;
        details.put(title, "no keyword match");
        continue;
      }

      WikipediaImageClient.Result thumbnail = wikipedia.fetchThumbnail(wikiPage);
      // Be polite to Wikipedia's API - a tight loop of 60+ requests risks rate limiting.
      try {
        Thread.sleep(400);
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }
      if (!thumbnail.ok()) {
        skippedNoThumbnail++;
        details.put(title, "wiki page '" + wikiPage + "' failed: " + thumbnail.failureReason());
        continue;
      }

      String candidateUrl = thumbnail.thumbnailUrl();
      long existingUses = jdbc.sql("SELECT COUNT(*) FROM marketplace_posts WHERE image_url = :img")
          .param("img", candidateUrl)
          .query(Long.class)
          .single();
      if (existingUses > 0) {
        skippedDuplicate++;
        details.put(title, "candidate image already used elsewhere - skipped");
        continue;
      }

      jdbc.sql("UPDATE marketplace_posts SET image_url = :img WHERE id = CAST(:id AS uuid)")
          .param("img", candidateUrl)
          .param("id", id)
          .update();
      updated++;
      details.put(title, "updated -> " + wikiPage);
    }

    log.info("Marketplace image backfill: {} updated, {} already had an image, {} no keyword match, "
            + "{} no wiki thumbnail, {} duplicate candidate skipped",
        updated, skippedHasImage, skippedNoMatch, skippedNoThumbnail, skippedDuplicate);

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("totalPosts", posts.size());
    summary.put("updated", updated);
    summary.put("skippedAlreadyHadImage", skippedHasImage);
    summary.put("skippedNoKeywordMatch", skippedNoMatch);
    summary.put("skippedNoWikiThumbnail", skippedNoThumbnail);
    summary.put("skippedDuplicateCandidate", skippedDuplicate);
    summary.put("details", details);
    return summary;
  }

  private String matchWikiPage(String title) {
    String lower = title.toLowerCase(Locale.ROOT);
    String bestKey = null;
    for (String key : WIKI_PAGES.keySet()) {
      if (lower.contains(key)) {
        if (bestKey == null || key.length() > bestKey.length()) {
          bestKey = key;
        }
      }
    }
    return bestKey == null ? null : WIKI_PAGES.get(bestKey);
  }
}
