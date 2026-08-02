package com.foodtrace.api.service;

import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Real weather via Open-Meteo — free, no API key, no rate-limit signup.
 * Ghana has no lat/lon on farms (just district/region text), so region
 * names are mapped to each region's capital as a practical stand-in.
 */
@Service
public class WeatherService {
  private static final Logger log = LoggerFactory.getLogger(WeatherService.class);

  private final RestClient restClient;

  public WeatherService() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(5000);
    factory.setReadTimeout(8000);
    this.restClient = RestClient.builder().requestFactory(factory).build();
  }

  private static final Map<String, double[]> REGION_COORDS = Map.ofEntries(
      Map.entry("greater accra", new double[]{5.6037, -0.1870}),
      Map.entry("ashanti", new double[]{6.6885, -1.6244}),
      Map.entry("western", new double[]{4.9047, -1.7554}),
      Map.entry("western north", new double[]{6.2049, -2.4857}),
      Map.entry("central", new double[]{5.1053, -1.2466}),
      Map.entry("volta", new double[]{6.6111, 0.4708}),
      Map.entry("oti", new double[]{8.0667, 0.1833}),
      Map.entry("eastern", new double[]{6.0940, -0.2591}),
      Map.entry("bono", new double[]{7.3399, -2.3268}),
      Map.entry("bono east", new double[]{7.5833, -1.9333}),
      Map.entry("ahafo", new double[]{6.8014, -2.5195}),
      Map.entry("northern", new double[]{9.4008, -0.8393}),
      Map.entry("savannah", new double[]{9.0833, -1.8167}),
      Map.entry("north east", new double[]{10.5167, -0.3667}),
      Map.entry("upper east", new double[]{10.7856, -0.8514}),
      Map.entry("upper west", new double[]{10.0601, -2.5099})
  );

  private static final double[] DEFAULT_COORDS = REGION_COORDS.get("greater accra");

  @SuppressWarnings("unchecked")
  public Map<String, Object> forRegion(String region) {
    double[] coords = region == null
        ? DEFAULT_COORDS
        : REGION_COORDS.getOrDefault(region.trim().toLowerCase(Locale.ROOT), DEFAULT_COORDS);
    String regionLabel = region == null ? "Greater Accra" : region;

    // Open-Meteo being slow, unreachable, or returning an unexpected shape
    // must degrade to "weather unavailable" for the farmer, not a raw 500 -
    // this is a supplementary dashboard widget, not something worth failing
    // the whole page load over.
    try {
      Map<String, Object> response = restClient.get()
          .uri("https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
              + "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
              + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
              + "&forecast_days=5&timezone=Africa/Accra",
              coords[0], coords[1])
          .retrieve()
          .body(Map.class);

      Map<String, Object> current = response == null ? null : (Map<String, Object>) response.get("current");
      Map<String, Object> daily = response == null ? null : (Map<String, Object>) response.get("daily");
      if (current == null) {
        return unavailable(regionLabel);
      }

      return Map.of(
          "region", regionLabel,
          "available", true,
          "current", Map.of(
              "temperatureC", current.get("temperature_2m"),
              "humidityPercent", current.get("relative_humidity_2m"),
              "precipitationMm", current.get("precipitation"),
              "windSpeedKmh", current.get("wind_speed_10m"),
              "condition", describeWeatherCode((Number) current.get("weather_code"))
          ),
          "forecast", daily == null ? Map.of() : daily
      );
    } catch (Exception e) {
      log.warn("Weather lookup failed for region {}: {}", regionLabel, e.getMessage());
      return unavailable(regionLabel);
    }
  }

  // The mobile/web weather widgets read current.temperatureC and
  // forecast.time.map(...) unconditionally with no null-guards, so this
  // fallback must keep the same shape (empty arrays, zeroed numbers) rather
  // than omit fields - an empty object here would just move today's 500
  // crash from the backend to a frontend TypeError instead of fixing it.
  private Map<String, Object> unavailable(String regionLabel) {
    return Map.of(
        "region", regionLabel,
        "available", false,
        "current", Map.of(
            "temperatureC", 0, "humidityPercent", 0, "precipitationMm", 0,
            "windSpeedKmh", 0, "condition", "Weather unavailable"),
        "forecast", Map.of(
            "time", java.util.List.of(),
            "temperature_2m_max", java.util.List.of(),
            "temperature_2m_min", java.util.List.of(),
            "precipitation_probability_max", java.util.List.of()));
  }

  /** WMO weather codes, simplified for a plain-language label. */
  private String describeWeatherCode(Number code) {
    if (code == null) return "Unknown";
    int c = code.intValue();
    if (c == 0) return "Clear sky";
    if (c <= 2) return "Partly cloudy";
    if (c == 3) return "Overcast";
    if (c == 45 || c == 48) return "Foggy";
    if (c >= 51 && c <= 57) return "Drizzle";
    if (c >= 61 && c <= 67) return "Rain";
    if (c >= 71 && c <= 77) return "Snow";
    if (c >= 80 && c <= 82) return "Rain showers";
    if (c >= 95) return "Thunderstorm";
    return "Variable";
  }
}
