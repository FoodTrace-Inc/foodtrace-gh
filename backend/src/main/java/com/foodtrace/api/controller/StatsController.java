package com.foodtrace.api.controller;

import com.foodtrace.api.service.StatsService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {
  private final StatsService statsService;

  public StatsController(StatsService statsService) {
    this.statsService = statsService;
  }

  @GetMapping("/total-scans")
  public Map<String, Object> totalScans() {
    return statsService.totalScans();
  }
}
