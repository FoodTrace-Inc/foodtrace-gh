package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.foodtrace.api.fda.FdaRegistryClient;
import com.foodtrace.api.fda.FdaScrapeResult;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Orchestrates a full pull from the Ghana FDA public registry and writes the
 * raw result to disk as JSON so it can be reviewed before anything is
 * imported into our own database. This is Part A of the FDA sync work only
 * — matching/importing into product_batches etc. is a separate, later step.
 */
@Service
public class FdaScraperService {
  private static final Logger log = LoggerFactory.getLogger(FdaScraperService.class);

  private final FdaRegistryClient client;
  private final Path scrapeDir;
  private final ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

  public FdaScraperService(FdaRegistryClient client, @Value("${foodtrace.fda-scrape-dir:fda-data}") String scrapeDir) {
    this.client = client;
    this.scrapeDir = Path.of(scrapeDir);
  }

  /**
   * Runs a full scrape (or up to {@code maxRecords} for a quick preview run)
   * and writes it to {@code fda-registry-scrape.json} in the configured
   * directory. Returns a summary — never throws for partial failures, since
   * a page failing mid-scrape shouldn't lose everything already fetched.
   */
  public Map<String, Object> scrapeToFile(Integer maxRecords) {
    Instant startedAt = Instant.now();
    FdaScrapeResult result = client.fetchAll(maxRecords);

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("scrapedAt", startedAt.toString());
    summary.put("recordsTotalOnFdaSite", result.recordsTotal());
    summary.put("recordsScraped", result.products().size());
    summary.put("pagesFailed", result.pageErrors().size());
    summary.put("pageErrors", result.pageErrors());

    try {
      Files.createDirectories(scrapeDir);
      Path outFile = scrapeDir.resolve("fda-registry-scrape.json");
      Map<String, Object> fileContents = new LinkedHashMap<>(summary);
      fileContents.put("products", result.products());
      mapper.writeValue(outFile.toFile(), fileContents);
      summary.put("savedTo", outFile.toAbsolutePath().toString());
      log.info("FDA registry scrape complete: {} products saved to {}", result.products().size(), outFile);
    } catch (IOException e) {
      log.error("FDA registry scrape: could not write output file", e);
      summary.put("savedTo", null);
      summary.put("writeError", e.getMessage());
    }
    return summary;
  }
}
