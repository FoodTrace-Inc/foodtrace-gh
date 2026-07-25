package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodtrace.api.fda.FdaNameMatcher;
import com.foodtrace.api.fda.FdaProduct;
import java.io.IOException;
import java.nio.file.Path;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Part B of the FDA sync: matches scraped registry products against our
 * existing product_batches / drug_batches by fuzzy name, records every
 * match attempt (matched or not) in fda_product_map, and — only when
 * {@code apply=true} and confidence is high — updates the matched row's
 * recall_status from the FDA's own status field, which is treated as the
 * source of truth.
 *
 * Low-confidence matches and products with no match at all are logged for
 * review, never silently applied. Unmatched FDA products are NOT used to
 * fabricate new product_batches/drug_batches rows here — doing that would
 * require inventing a seller (manufacturer/pharmacy) for a product nobody
 * on FoodTrace GH actually registered, which is a business decision, not a
 * scraping/matching one.
 */
@Service
public class FdaImportService {
  private static final Logger log = LoggerFactory.getLogger(FdaImportService.class);
  private static final double HIGH_CONFIDENCE = 0.75;
  private static final double LOW_CONFIDENCE = 0.35;
  // Each database round trip to the (remote) Render instance costs ~300ms;
  // at 16k+ records that's over an hour one row at a time. Batching multi-row
  // statements cuts round trips ~100x. Confirmed via timing: 200 individual
  // upserts took 61s; unacceptable at full registry scale.
  private static final int BATCH_SIZE = 100;

  private record PendingMapRow(FdaProduct product, UUID productBatchId, UUID drugBatchId, double confidence, String matchStatus) {
  }

  private final JdbcClient jdbc;
  private final Path scrapeDir;
  private final NotificationService notificationService;
  private final ObjectMapper mapper = new ObjectMapper();

  public FdaImportService(JdbcClient jdbc, NotificationService notificationService,
      @Value("${foodtrace.fda-scrape-dir:fda-data}") String scrapeDir) {
    this.jdbc = jdbc;
    this.notificationService = notificationService;
    this.scrapeDir = Path.of(scrapeDir);
  }

  /** Reads the most recent scrape output written by FdaScraperService and imports it. */
  @SuppressWarnings("unchecked")
  public Map<String, Object> importFromLastScrape(boolean apply) {
    Path scrapeFile = scrapeDir.resolve("fda-registry-scrape.json");
    if (!scrapeFile.toFile().exists()) {
      throw new IllegalStateException("No scrape file found at " + scrapeFile.toAbsolutePath()
          + " — run POST /api/admin/fda/scrape first.");
    }
    try {
      Map<String, Object> raw = mapper.readValue(scrapeFile.toFile(), Map.class);
      List<Map<String, Object>> rawProducts = (List<Map<String, Object>>) raw.get("products");
      List<FdaProduct> products = new ArrayList<>();
      for (Map<String, Object> row : rawProducts) {
        products.add(mapper.convertValue(row, FdaProduct.class));
      }
      return importProducts(products, apply);
    } catch (IOException e) {
      throw new IllegalStateException("Could not read scrape file " + scrapeFile, e);
    }
  }

  public Map<String, Object> importProducts(List<FdaProduct> fdaProducts, boolean apply) {
    List<Map<String, Object>> foodCandidates = jdbc.sql(
        "SELECT id, product_name AS name, recall_status FROM product_batches WHERE product_name IS NOT NULL").query().listOfRows();
    List<Map<String, Object>> drugCandidates = jdbc.sql(
        "SELECT db.id AS id, d.name AS name, db.recall_status FROM drug_batches db JOIN drugs d ON d.id = db.drug_id")
        .query().listOfRows();
    Map<UUID, String> priorStatusById = new HashMap<>();
    Map<UUID, String> nameById = new HashMap<>();
    for (Map<String, Object> c : foodCandidates) {
      priorStatusById.put((UUID) c.get("id"), String.valueOf(c.get("recall_status")));
      nameById.put((UUID) c.get("id"), String.valueOf(c.get("name")));
    }
    for (Map<String, Object> c : drugCandidates) {
      priorStatusById.put((UUID) c.get("id"), String.valueOf(c.get("recall_status")));
      nameById.put((UUID) c.get("id"), String.valueOf(c.get("name")));
    }
    // (bucket, id) pairs whose recall_status is about to flip to 'recalled'
    // for the first time this run — these are the only ones worth alerting
    // past scanners about; a batch that was already recalled shouldn't
    // re-notify every sync.
    List<Object[]> newlyRecalled = new ArrayList<>();

    int matchedApplied = 0;
    int matchedPendingReview = 0;
    int unmatched = 0;
    int failed = 0;
    Map<String, Integer> byCategory = new LinkedHashMap<>();
    List<Map<String, Object>> sampleApplied = new ArrayList<>();
    List<Map<String, Object>> sampleFailed = new ArrayList<>();
    // Recall-status updates for high-confidence matches, applied in one batch
    // at the end rather than one UPDATE per row.
    List<Object[]> recallUpdates = new ArrayList<>(); // [table, id, status, reason]
    List<PendingMapRow> pendingRows = new ArrayList<>();

    for (FdaProduct p : fdaProducts) {
      String bucket = categorize(p.productCategory());
      byCategory.merge(bucket, 1, Integer::sum);
      if (p.registrationNumber() == null || p.registrationNumber().isBlank()) {
        failed++;
        if (sampleFailed.size() < 10) sampleFailed.add(Map.of("productName", nullToEmpty(p.productName()), "reason", "missing registration number"));
        continue;
      }

      try {
        if (bucket.equals("other")) {
          pendingRows.add(new PendingMapRow(p, null, null, 0.0, "unmatched"));
          unmatched++;
          continue;
        }

        List<Map<String, Object>> candidates = bucket.equals("food") ? foodCandidates : drugCandidates;
        UUID bestId = null;
        double bestScore = 0.0;
        for (Map<String, Object> c : candidates) {
          double score = FdaNameMatcher.score((String) c.get("name"), p.productName());
          if (score > bestScore) {
            bestScore = score;
            bestId = (UUID) c.get("id");
          }
        }

        UUID productBatchId = bucket.equals("food") ? bestId : null;
        UUID drugBatchId = bucket.equals("drug") ? bestId : null;

        if (bestId != null && bestScore >= HIGH_CONFIDENCE) {
          if (apply) {
            String status = mapFdaStatusToRecallStatus(p.status());
            recallUpdates.add(new Object[] {
                bucket.equals("food") ? "product_batches" : "drug_batches",
                bestId.toString(), status, "FDA registry status: " + nullToEmpty(p.status())
            });
            if (status.equals("recalled") && !"recalled".equals(priorStatusById.get(bestId))) {
              newlyRecalled.add(new Object[] { bucket, bestId, nameById.getOrDefault(bestId, p.productName()) });
            }
          }
          pendingRows.add(new PendingMapRow(p, productBatchId, drugBatchId, bestScore, apply ? "matched_applied" : "matched_pending_review"));
          if (apply) {
            matchedApplied++;
            if (sampleApplied.size() < 25) {
              sampleApplied.add(Map.of("fdaProductName", p.productName(), "matchedId", bestId.toString(), "confidence", bestScore, "fdaStatus", nullToEmpty(p.status())));
            }
          } else {
            matchedPendingReview++;
          }
        } else if (bestId != null && bestScore >= LOW_CONFIDENCE) {
          pendingRows.add(new PendingMapRow(p, productBatchId, drugBatchId, bestScore, "matched_pending_review"));
          matchedPendingReview++;
        } else {
          pendingRows.add(new PendingMapRow(p, null, null, bestScore, "unmatched"));
          unmatched++;
        }
      } catch (Exception e) {
        failed++;
        log.warn("FDA import: failed to process {} ({})", p.productName(), e.getMessage());
        if (sampleFailed.size() < 10) sampleFailed.add(Map.of("productName", nullToEmpty(p.productName()), "reason", String.valueOf(e.getMessage())));
      }

      if (pendingRows.size() >= BATCH_SIZE) {
        List<PendingMapRow> chunk = List.copyOf(pendingRows);
        if (!withRetry(() -> batchUpsertMapRows(chunk), "map-upsert chunk starting " + chunk.get(0).product().productName())) {
          failed += chunk.size();
        }
        pendingRows.clear();
      }
    }
    if (!pendingRows.isEmpty()) {
      List<PendingMapRow> chunk = List.copyOf(pendingRows);
      if (!withRetry(() -> batchUpsertMapRows(chunk), "final map-upsert chunk")) {
        failed += chunk.size();
      }
    }
    if (!recallUpdates.isEmpty()) {
      withRetry(() -> batchApplyRecallStatus(recallUpdates), "recall-status apply");
    }
    int newlyRecalledCount = 0;
    if (!newlyRecalled.isEmpty()) {
      for (Object[] r : newlyRecalled) {
        String bucket = (String) r[0];
        UUID id = (UUID) r[1];
        String name = (String) r[2];
        try {
          if (bucket.equals("food")) {
            notificationService.notifyScannersOfRecall(id.toString(), name);
          } else {
            notificationService.notifyDrugScannersOfRecall(id.toString(), name);
          }
          newlyRecalledCount++;
        } catch (Exception e) {
          log.warn("FDA import: recall notification failed for {} {} ({})", bucket, id, e.getMessage());
        }
      }
    }

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("apply", apply);
    summary.put("totalScraped", fdaProducts.size());
    summary.put("matchedApplied", matchedApplied);
    summary.put("matchedPendingReview", matchedPendingReview);
    summary.put("unmatched", unmatched);
    summary.put("failed", failed);
    summary.put("newlyRecalled", newlyRecalledCount);
    summary.put("byCategory", byCategory);
    summary.put("sampleApplied", sampleApplied);
    summary.put("sampleFailed", sampleFailed);
    log.info("FDA import complete: applied={} pendingReview={} unmatched={} failed={} newlyRecalled={} (apply={})",
        matchedApplied, matchedPendingReview, unmatched, failed, newlyRecalledCount, apply);
    return summary;
  }

  /**
   * Retries a DB operation up to 3 times with a short backoff. The Render
   * connection has been observed to silently die mid-batch during long
   * import runs (confirmed: the request thread blocks forever on a chunk
   * with no exception, until the datasource socketTimeout — added
   * alongside this — cuts it off). A transient failure on one chunk out of
   * ~165 shouldn't sink the whole import; skip that chunk and keep going
   * rather than losing everything already written.
   */
  private boolean withRetry(Runnable action, String label) {
    for (int attempt = 1; attempt <= 3; attempt++) {
      try {
        action.run();
        return true;
      } catch (Exception e) {
        log.warn("FDA import: {} failed on attempt {}/3 ({})", label, attempt, e.getMessage());
        if (attempt < 3) {
          try {
            Thread.sleep(2000L * attempt);
          } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return false;
          }
        }
      }
    }
    log.error("FDA import: {} failed after 3 attempts, skipping this chunk", label);
    return false;
  }

  /** Food/Water/Herbal/Spices/etc. -> "food"; Drug/Drugs/POM -> "drug"; anything else (cosmetics, devices) -> "other" (not matched against our data, which only models food and drug batches). */
  private String categorize(String fdaCategory) {
    if (fdaCategory == null) return "other";
    String c = fdaCategory.trim().toLowerCase(Locale.ROOT);
    if (c.startsWith("food") || c.startsWith("water") || c.startsWith("herbal") || c.startsWith("spice")
        || c.startsWith("soup") || c.startsWith("meat") || c.startsWith("fish") || c.startsWith("root")
        || c.startsWith("fat")) {
      return "food";
    }
    if (c.startsWith("drug") || c.equals("pom")) {
      return "drug";
    }
    return "other";
  }

  /**
   * FDA's own status is the source of truth for whether a matched product is
   * currently sellable. Only high-confidence matches with apply=true reach
   * here, which is naturally a small subset of the full scrape (a few
   * hundred at most, not 16k+) — so per-row updates are fine; the dominant
   * cost (one write per scraped record, regardless of match) is what
   * batchUpsertMapRows batches instead.
   */
  private void batchApplyRecallStatus(List<Object[]> updates) {
    for (Object[] u : updates) {
      String table = (String) u[0];
      String id = (String) u[1];
      String status = (String) u[2];
      String reason = (String) u[3];
      try {
        if (table.equals("product_batches")) {
          // product_batches has recall_reason/recalled_at; drug_batches does not.
          jdbc.sql("UPDATE product_batches SET recall_status = CAST(:status AS recall_status), "
                  + "recall_reason = CASE WHEN CAST(:status AS recall_status) = 'recalled' THEN :reason ELSE recall_reason END, "
                  + "recalled_at = CASE WHEN CAST(:status AS recall_status) = 'recalled' AND recalled_at IS NULL THEN now() ELSE recalled_at END "
                  + "WHERE id = CAST(:id AS uuid)")
              .param("status", status)
              .param("reason", reason)
              .param("id", id)
              .update();
        } else {
          jdbc.sql("UPDATE drug_batches SET recall_status = CAST(:status AS recall_status) WHERE id = CAST(:id AS uuid)")
              .param("status", status)
              .param("id", id)
              .update();
        }
      } catch (Exception e) {
        // One bad row (schema mismatch, stale id, etc.) shouldn't cost every
        // other row in this batch its recall-status update.
        log.warn("FDA import: recall-status update failed for {} id={} ({})", table, id, e.getMessage());
      }
    }
  }

  private String mapFdaStatusToRecallStatus(String fdaStatus) {
    if (fdaStatus == null) return "under_investigation";
    String s = fdaStatus.trim().toLowerCase(Locale.ROOT);
    if (s.contains("valid")) return "active";
    if (s.contains("expiry") || s.contains("expire")) return "under_investigation";
    return "recalled"; // suspended / revoked / cancelled / banned / withdrawn / anything unrecognized
  }

  /**
   * Builds one multi-row INSERT ... ON CONFLICT statement for the whole
   * chunk instead of one statement per row. This is the call every single
   * scraped record goes through, so it's the one that actually determines
   * whether an import finishes in seconds or in over an hour.
   */
  private void batchUpsertMapRows(List<PendingMapRow> rows) {
    if (rows.isEmpty()) return;
    log.info("FDA import: flushing chunk of {} rows, first={}, last={}",
        rows.size(), rows.get(0).product().productName(), rows.get(rows.size() - 1).product().productName());
    // Two products can legitimately share a registration number in the raw
    // scrape (re-registrations, renewals); keep only the last one per number
    // within this chunk so the multi-row VALUES list has no duplicate
    // conflict target, which Postgres rejects ("ON CONFLICT DO UPDATE
    // command cannot affect row a second time").
    Map<String, PendingMapRow> deduped = new LinkedHashMap<>();
    for (PendingMapRow row : rows) deduped.put(row.product().registrationNumber(), row);

    List<String> valueGroups = new ArrayList<>();
    Map<String, Object> params = new LinkedHashMap<>();
    int i = 0;
    for (PendingMapRow row : deduped.values()) {
      FdaProduct p = row.product();
      String suffix = String.valueOf(i++);
      valueGroups.add("(:regNumber" + suffix + ", :productUuid" + suffix + ", CAST(:productBatchId" + suffix + " AS uuid), "
          + "CAST(:drugBatchId" + suffix + " AS uuid), :productName" + suffix + ", :manufacturer" + suffix + ", "
          + ":category" + suffix + ", :status" + suffix + ", CAST(:regDate" + suffix + " AS date), "
          + "CAST(:expDate" + suffix + " AS date), :confidence" + suffix + ", :matchStatus" + suffix + ", now())");
      params.put("regNumber" + suffix, p.registrationNumber());
      params.put("productUuid" + suffix, p.productUuid());
      params.put("productBatchId" + suffix, row.productBatchId() == null ? null : row.productBatchId().toString());
      params.put("drugBatchId" + suffix, row.drugBatchId() == null ? null : row.drugBatchId().toString());
      params.put("productName" + suffix, nullToEmpty(p.productName()));
      params.put("manufacturer" + suffix, p.manufacturer());
      params.put("category" + suffix, p.productCategory());
      params.put("status" + suffix, nullToEmpty(p.status()));
      params.put("regDate" + suffix, safeDate(p.registrationDate()));
      params.put("expDate" + suffix, safeDate(p.expiryDate()));
      params.put("confidence" + suffix, row.confidence());
      params.put("matchStatus" + suffix, row.matchStatus());
    }

    String sql = "INSERT INTO fda_product_map (fda_registration_number, fda_product_uuid, product_batch_id, "
        + "drug_batch_id, fda_product_name, fda_manufacturer, fda_category, fda_status, fda_registration_date, "
        + "fda_expiry_date, match_confidence, match_status, last_synced_at) VALUES "
        + String.join(", ", valueGroups)
        + " ON CONFLICT (fda_registration_number) DO UPDATE SET "
        + "fda_product_uuid = EXCLUDED.fda_product_uuid, product_batch_id = EXCLUDED.product_batch_id, "
        + "drug_batch_id = EXCLUDED.drug_batch_id, fda_product_name = EXCLUDED.fda_product_name, "
        + "fda_manufacturer = EXCLUDED.fda_manufacturer, fda_category = EXCLUDED.fda_category, "
        + "fda_status = EXCLUDED.fda_status, fda_registration_date = EXCLUDED.fda_registration_date, "
        + "fda_expiry_date = EXCLUDED.fda_expiry_date, match_confidence = EXCLUDED.match_confidence, "
        + "match_status = EXCLUDED.match_status, last_synced_at = now()";

    var statement = jdbc.sql(sql);
    for (Map.Entry<String, Object> e : params.entrySet()) {
      statement = statement.param(e.getKey(), e.getValue());
    }
    statement.update();
    log.info("FDA import: chunk of {} rows written", deduped.size());
  }

  private Date safeDate(String iso) {
    if (iso == null || iso.isBlank()) return null;
    try {
      return Date.valueOf(LocalDate.parse(iso));
    } catch (DateTimeParseException e) {
      return null;
    }
  }

  private String nullToEmpty(String s) {
    return s == null ? "" : s;
  }
}
