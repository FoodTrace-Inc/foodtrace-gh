package com.foodtrace.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
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

  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private final ObjectMapper mapper = new ObjectMapper();

  /** Returns the page's thumbnail image URL, or empty if the page has none / doesn't exist / the request failed. */
  public Optional<String> fetchThumbnail(String wikiPageName) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(BASE_URL + wikiPageName))
          .header("User-Agent", "FoodTraceGH/1.0 (demo marketplace images)")
          .timeout(Duration.ofSeconds(10))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("Wikipedia summary for '{}' returned HTTP {}", wikiPageName, response.statusCode());
        return Optional.empty();
      }
      JsonNode root = mapper.readTree(response.body());
      String source = root.path("thumbnail").path("source").asText(null);
      return source == null || source.isBlank() ? Optional.empty() : Optional.of(source);
    } catch (Exception e) {
      log.warn("Wikipedia summary fetch failed for '{}': {}", wikiPageName, e.getMessage());
      return Optional.empty();
    }
  }
}
