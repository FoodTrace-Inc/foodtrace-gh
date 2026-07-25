package com.foodtrace.api.controller;

import com.foodtrace.api.service.FdaImportService;
import com.foodtrace.api.service.FdaScraperService;
import com.foodtrace.api.service.FdaSyncSchedulerService;
import com.foodtrace.api.service.QrBackfillService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final FdaScraperService fdaScraperService;
  private final FdaImportService fdaImportService;
  private final QrBackfillService qrBackfillService;
  private final FdaSyncSchedulerService fdaSyncSchedulerService;

  public AdminController(FdaScraperService fdaScraperService, FdaImportService fdaImportService,
      QrBackfillService qrBackfillService, FdaSyncSchedulerService fdaSyncSchedulerService) {
    this.fdaScraperService = fdaScraperService;
    this.fdaImportService = fdaImportService;
    this.qrBackfillService = qrBackfillService;
    this.fdaSyncSchedulerService = fdaSyncSchedulerService;
  }

  /**
   * Pulls the Ghana FDA public products registry and writes it to disk for
   * review. Regulator-only (see SecurityConfig). {@code limit} caps the pull
   * for a quick preview instead of the full ~16k-record registry.
   */
  @PostMapping("/fda/scrape")
  public Map<String, Object> scrapeFda(@RequestParam(required = false) Integer limit) {
    return fdaScraperService.scrapeToFile(limit);
  }

  /**
   * Matches the most recently scraped FDA registry file against our existing
   * product_batches/drug_batches, records every attempt in fda_product_map,
   * and — only when {@code apply=true} — updates high-confidence matches'
   * recall_status from the FDA's own status. Defaults to a dry run
   * ({@code apply=false}) so nothing changes until reviewed.
   */
  @PostMapping("/fda/import")
  public Map<String, Object> importFda(@RequestParam(defaultValue = "false") boolean apply) {
    return fdaImportService.importFromLastScrape(apply);
  }

  /**
   * Part C safety net: normal batch creation (ManufacturerService/
   * DrugService) already generates a QR code inline for every new batch.
   * This finds and fixes any batch that somehow ended up without one (e.g.
   * seeded directly rather than through the API).
   */
  @PostMapping("/qr/backfill")
  public Map<String, Object> backfillQrCodes() {
    return qrBackfillService.backfill();
  }

  /**
   * Part D manual trigger: runs the same scrape -> match -> apply pipeline
   * the scheduled 3am job runs, on demand, and records it in sync_log the
   * same way. Useful for "did the new FDA recall show up yet" without
   * waiting for the next scheduled run.
   */
  @PostMapping("/sync-fda")
  public Map<String, Object> syncFda() {
    return fdaSyncSchedulerService.runSync("fda_manual");
  }
}
