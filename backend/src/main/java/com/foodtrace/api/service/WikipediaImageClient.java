package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper over Wikipedia's REST summary API
 * (https://en.wikipedia.org/api/rest_v1/page/summary/{page}), used only to
 * source stable, correctly-attributed thumbnail images for demo marketplace
 * products by exact page name - never a free-text image search.
 */
@Component
public class WikipediaImageClient {
  private static final Logger log = LoggerFactory.getLogger(WikipediaImageClient.class);
  private static final String BASE_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";

  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
  private final ObjectMapper mapper = new ObjectMapper();

  public record Result(String thumbnailUrl, String failureReason) {
    public boolean ok() {
      return thumbnailUrl != null;
    }
  }

  /** Returns the page's thumbnail image URL, or a specific failure reason (HTTP status / exception) if it couldn't be fetched. */
  public Result fetchThumbnail(String wikiPageName) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(BASE_URL + wikiPageName))
          .header("User-Agent", "FoodTraceGH/1.0 (https://foodtrace-gh.onrender.com; demo marketplace images)")
          .header("Accept", "application/json")
          .timeout(Duration.ofSeconds(15))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("Wikipedia summary for '{}' returned HTTP {}: {}", wikiPageName, response.statusCode(),
            response.body().length() > 200 ? response.body().substring(0, 200) : response.body());
        return new Result(null, "HTTP " + response.statusCode());
      }
      JsonNode root = mapper.readTree(response.body());
      String source = root.path("thumbnail").path("source").asText(null);
      if (source == null || source.isBlank()) {
        return new Result(null, "no thumbnail field in response");
      }
      return new Result(source, null);
    } catch (Exception e) {
      log.warn("Wikipedia summary fetch failed for '{}': {}", wikiPageName, e.toString());
      return new Result(null, e.getClass().getSimpleName() + ": " + e.getMessage());
    }
  }
}
