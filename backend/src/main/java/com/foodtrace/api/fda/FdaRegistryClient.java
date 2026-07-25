package com.foodtrace.api.fda;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Talks to the Ghana FDA's public product registry
 * (https://verifypermit.fdaghana.gov.gh/publicsearch) — a server-side
 * DataTables (Yajra/Laravel) endpoint with no authentication. Returns JSON
 * directly; there is no HTML to parse.
 *
 * The registry's TLS certificate expired 2025-09-02 and was never renewed —
 * confirmed to be a neglected-ops issue on the FDA's end (the site itself
 * responds normally once the cert is bypassed), not a block against
 * scrapers. This client therefore uses a permissive TrustManager scoped to
 * this one HttpClient instance only; it is never reused for any other host,
 * so it does not weaken TLS validation anywhere else in the app.
 */
@Component
public class FdaRegistryClient {
  private static final Logger log = LoggerFactory.getLogger(FdaRegistryClient.class);
  private static final String ENDPOINT = "https://verifypermit.fdaghana.gov.gh/publicsearch";
  private static final int PAGE_SIZE = 200;
  private static final Duration DELAY_BETWEEN_PAGES = Duration.ofSeconds(2);

  // Columns the registry's DataTables config declares, in order. Each request
  // must echo the full column list back (data/name/searchable/orderable) or
  // the server-side Yajra handler throws a 500 — confirmed by trial.
  private static final List<String[]> COLUMNS = List.of(
      new String[] {"DT_RowIndex", "DT_RowIndex", "false", "true"},
      new String[] {"client_name", "tbl_client_details.client_name", "true", "true"},
      new String[] {"product_name", "product_name", "true", "true"},
      new String[] {"product_category", "product_category", "true", "true"},
      new String[] {"expiry_date", "expiry_date", "true", "true"},
      new String[] {"status", "tbl_products_details.status", "true", "true"},
      new String[] {"action", "action", "false", "false"}
  );

  private final HttpClient httpClient;
  private final ObjectMapper mapper = new ObjectMapper();

  public FdaRegistryClient() {
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .sslContext(trustAllForThisClientOnly())
        .build();
  }

  /** Fetches one page starting at {@code start}, optionally filtered by {@code searchValue}. */
  public FdaRegistryPage fetchPage(int start, int length, String searchValue) throws Exception {
    String query = buildQuery(start, length, searchValue);
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(ENDPOINT + "?" + query))
        .header("User-Agent", "FoodTraceGH-FDASync/1.0 (+https://foodtrace-gh.onrender.com; responsible use, 2s delay between requests)")
        .header("X-Requested-With", "XMLHttpRequest")
        .header("Accept", "application/json")
        .timeout(Duration.ofSeconds(30))
        .GET()
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() != 200) {
      throw new IllegalStateException("FDA registry returned HTTP " + response.statusCode() + " for start=" + start);
    }
    return mapper.readValue(response.body(), FdaRegistryPage.class);
  }

  /**
   * Fetches every record in the registry (or up to {@code maxRecords} if set),
   * paginating politely with a delay between requests. A page that fails
   * (network error, bad JSON, non-200) is logged and skipped rather than
   * aborting the whole run — partial data beats none.
   */
  public FdaScrapeResult fetchAll(Integer maxRecords) {
    List<FdaProduct> all = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    int start = 0;
    int total = Integer.MAX_VALUE;
    int pageSize = PAGE_SIZE;

    while (start < total) {
      int remaining = maxRecords != null ? maxRecords - all.size() : pageSize;
      int length = Math.min(pageSize, Math.max(remaining, 1));
      try {
        FdaRegistryPage page = fetchPage(start, length, null);
        total = page.recordsTotal();
        if (maxRecords != null) total = Math.min(total, maxRecords);
        List<FdaProduct> data = page.data();
        if (maxRecords != null && all.size() + data.size() > maxRecords) {
          data = data.subList(0, maxRecords - all.size());
        }
        all.addAll(data);
        log.info("FDA registry scrape: fetched {} / {} records", all.size(), total);
      } catch (Exception e) {
        errors.add("start=" + start + ": " + e.getMessage());
        log.warn("FDA registry scrape: page at start={} failed, skipping ({})", start, e.getMessage());
      }
      start += length;
      if (start < total) {
        try {
          Thread.sleep(DELAY_BETWEEN_PAGES.toMillis());
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          break;
        }
      }
    }
    return new FdaScrapeResult(all, total == Integer.MAX_VALUE ? all.size() : total, errors);
  }

  private String buildQuery(int start, int length, String searchValue) {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("draw", "1");
    params.put("start", String.valueOf(start));
    params.put("length", String.valueOf(length));
    params.put("search[value]", searchValue == null ? "" : searchValue);
    params.put("search[regex]", "false");
    for (int i = 0; i < COLUMNS.size(); i++) {
      String[] c = COLUMNS.get(i);
      params.put("columns[" + i + "][data]", c[0]);
      params.put("columns[" + i + "][name]", c[1]);
      params.put("columns[" + i + "][searchable]", c[2]);
      params.put("columns[" + i + "][orderable]", c[3]);
      params.put("columns[" + i + "][search][value]", "");
      params.put("columns[" + i + "][search][regex]", "false");
    }
    params.put("order[0][column]", "2");
    params.put("order[0][dir]", "asc");

    StringBuilder sb = new StringBuilder();
    for (Map.Entry<String, String> e : params.entrySet()) {
      if (sb.length() > 0) sb.append('&');
      sb.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8))
          .append('=')
          .append(URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8));
    }
    return sb.toString();
  }

  private static SSLContext trustAllForThisClientOnly() {
    try {
      TrustManager[] trustAll = new TrustManager[] {
          new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] chain, String authType) { }
            public void checkServerTrusted(X509Certificate[] chain, String authType) { }
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
          }
      };
      SSLContext ctx = SSLContext.getInstance("TLS");
      ctx.init(null, trustAll, new SecureRandom());
      return ctx;
    } catch (Exception e) {
      throw new IllegalStateException("Could not build permissive SSL context for FDA registry client", e);
    }
  }
}
