package com.foodtrace.api.service;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Part D: keeps our data in step with the Ghana FDA registry without a human
 * running Part A/B by hand every day. Runs a full scrape + match + apply
 * cycle once every 24 hours, and records the outcome in sync_log so there's
 * a visible audit trail (started/finished time, counts, success/failure).
 *
 * Reuses FdaScraperService/FdaImportService exactly as built for the manual
 * admin endpoints — same batching, same retry/timeout hardening proven
 * against the real 16k-record registry. A scheduled 3am run is exactly the
 * kind of long-running job that hit the transient Render connection drops
 * during manual testing; the retry logic in FdaImportService already
 * handles that, so this scheduler doesn't need its own.
 */
@Service
public class FdaSyncSchedulerService {
  private static final Logger log = LoggerFactory.getLogger(FdaSyncSchedulerService.class);

  private final FdaScraperService scraperService;
  private final FdaImportService importService;
  private final JdbcClient jdbc;

  public FdaSyncSchedulerService(FdaScraperService scraperService, FdaImportService importService, JdbcClient jdbc) {
    this.scraperService = scraperService;
    this.importService = importService;
    this.jdbc = jdbc;
  }

  /** Runs once a day at 03:00 server time — quiet hours, before the morning traffic. */
  @Scheduled(cron = "0 0 3 * * *")
  public void scheduledSync() {
    log.info("FDA sync: starting scheduled daily sync");
    runSync("fda_scheduled");
  }

  /** Shared by the scheduled job and the manual POST /api/admin/fda/sync-fda endpoint. */
  public Map<String, Object> runSync(String syncType) {
    UUID logId = UUID.randomUUID();
    jdbc.sql("INSERT INTO sync_log (id, sync_type, status, started_at) VALUES (CAST(:id AS uuid), :type, 'running', now())")
        .param("id", logId.toString())
        .param("type", syncType)
        .update();

    try {
      scraperService.scrapeToFile(null);
      Map<String, Object> result = importService.importFromLastScrape(true);

      jdbc.sql("""
          UPDATE sync_log SET status = 'success', finished_at = now(),
            records_scraped = :scraped, matched_applied = :applied, matched_pending_review = :pending,
            unmatched = :unmatched, failed_records = :failed, newly_recalled = :recalled
          WHERE id = CAST(:id AS uuid)
          """)
          .param("scraped", (Integer) result.get("totalScraped"))
          .param("applied", (Integer) result.get("matchedApplied"))
          .param("pending", (Integer) result.get("matchedPendingReview"))
          .param("unmatched", (Integer) result.get("unmatched"))
          .param("failed", (Integer) result.get("failed"))
          .param("recalled", (Integer) result.get("newlyRecalled"))
          .param("id", logId.toString())
          .update();

      log.info("FDA sync ({}) complete: {}", syncType, result);
      return result;
    } catch (Exception e) {
      log.error("FDA sync ({}) failed", syncType, e);
      jdbc.sql("UPDATE sync_log SET status = 'failed', finished_at = now(), error_message = :err WHERE id = CAST(:id AS uuid)")
          .param("err", String.valueOf(e.getMessage()))
          .param("id", logId.toString())
          .update();
      return Map.of("status", "failed", "error", String.valueOf(e.getMessage()));
    }
  }
}
