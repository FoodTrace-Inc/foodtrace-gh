package com.foodtrace.api.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Converts marketplace_posts.image_url values that are live external links
 * (e.g. Wikipedia's CDN) into self-contained base64 data URIs, so the app
 * never has to reach a third-party server at scan/browse time - only the
 * backend, which is the one thing it already depends on. This is what made
 * the original demo images reliable; the earlier Wikipedia backfill
 * regressed that by linking out live instead of embedding.
 */
@Service
public class MarketplaceImageEmbedService {
  private static final Logger log = LoggerFactory.getLogger(MarketplaceImageEmbedService.class);

  private final JdbcClient jdbc;
  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

  public MarketplaceImageEmbedService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> run() {
    List<Map<String, Object>> posts = jdbc.sql("""
        SELECT id, title, image_url FROM marketplace_posts
        WHERE image_url LIKE 'http%'
        """)
        .query(DatabaseRowMapper::toMap)
        .list();

    int embedded = 0;
    int failed = 0;
    Map<String, Object> details = new LinkedHashMap<>();

    for (Map<String, Object> post : posts) {
      String id = String.valueOf(post.get("id"));
      String title = String.valueOf(post.get("title"));
      String url = String.valueOf(post.get("imageUrl"));

      try {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("User-Agent", "FoodTraceGH/1.0 (https://foodtrace-gh.onrender.com; embedding demo images)")
            .timeout(Duration.ofSeconds(15))
            .GET()
            .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() != 200) {
          failed++;
          details.put(title, "download failed: HTTP " + response.statusCode());
          continue;
        }
        String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
        if (!contentType.startsWith("image/")) {
          failed++;
          details.put(title, "not an image content-type: " + contentType);
          continue;
        }
        byte[] bytes = response.body();
        if (bytes.length > 900_000) {
          // Keep the embedded payload reasonable - this is a demo app, not a CDN.
          failed++;
          details.put(title, "image too large to embed (" + bytes.length + " bytes)");
          continue;
        }
        String dataUri = "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);

        jdbc.sql("UPDATE marketplace_posts SET image_url = :img WHERE id = CAST(:id AS uuid)")
            .param("img", dataUri)
            .param("id", id)
            .update();
        embedded++;
        details.put(title, "embedded (" + bytes.length + " bytes)");
      } catch (Exception e) {
        failed++;
        details.put(title, "error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
      }
    }

    log.info("Marketplace image embed: {} embedded, {} failed", embedded, failed);
    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("totalExternalUrls", posts.size());
    summary.put("embedded", embedded);
    summary.put("failed", failed);
    summary.put("details", details);
    return summary;
  }
}
