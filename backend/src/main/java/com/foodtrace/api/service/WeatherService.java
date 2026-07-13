package com.foodtrace.api.service;

import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Real weather via Open-Meteo — free, no API key, no rate-limit signup.
 * Ghana has no lat/lon on farms (just district/region text), so region
 * names are mapped to each region's capital as a practical stand-in.
 */
@Service
public class WeatherService {
  private final RestClient restClient = RestClient.create();

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

    Map<String, Object> response = restClient.get()
        .uri("https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            + "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
            + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
            + "&forecast_days=5&timezone=Africa/Accra",
            coords[0], coords[1])
        .retrieve()
        .body(Map.class);

    Map<String, Object> current = (Map<String, Object>) response.get("current");
    Map<String, Object> daily = (Map<String, Object>) response.get("daily");

    return Map.of(
        "region", region == null ? "Greater Accra" : region,
        "current", Map.of(
            "temperatureC", current.get("temperature_2m"),
            "humidityPercent", current.get("relative_humidity_2m"),
            "precipitationMm", current.get("precipitation"),
            "windSpeedKmh", current.get("wind_speed_10m"),
            "condition", describeWeatherCode((Number) current.get("weather_code"))
        ),
        "forecast", daily
    );
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
