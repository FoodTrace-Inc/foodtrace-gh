package com.foodtrace.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodtrace.api.service.ScanService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ScanControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean JdbcClient jdbcClient;
  @MockBean ScanService scanService;

  @Test
  void scan_safe_product_returns_green_status() throws Exception {
    when(scanService.scanFood(eq("FT-QR-1001"), any())).thenReturn(Map.of(
        "codeString", "FT-QR-1001",
        "status", "safe",
        "statusLabel", "GREEN",
        "title", "Verified product",
        "summary", "No recall flag found for this batch.",
        "recommendedAction", "Proceed normally."));

    mockMvc.perform(get("/api/scan/FT-QR-1001"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result.status").value("safe"))
        .andExpect(jsonPath("$.result.statusLabel").value("GREEN"));
  }

  @Test
  void scan_recalled_product_returns_red_status() throws Exception {
    when(scanService.scanFood(eq("FT-QR-4004"), any())).thenReturn(Map.of(
        "codeString", "FT-QR-4004",
        "status", "recalled",
        "statusLabel", "RED",
        "title", "Recalled product",
        "summary", "This product is flagged for recall. Do not consume it.",
        "recommendedAction", "Do not consume. Return to seller or report to FDA."));

    mockMvc.perform(get("/api/scan/FT-QR-4004"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result.status").value("recalled"))
        .andExpect(jsonPath("$.result.statusLabel").value("RED"));
  }

  @Test
  void scan_unknown_code_returns_not_found() throws Exception {
    when(scanService.scanFood(eq("UNKNOWN"), any())).thenReturn(Map.of(
        "codeString", "UNKNOWN",
        "status", "not_found",
        "title", "Product not found",
        "summary", "No batch found for this QR code."));

    mockMvc.perform(get("/api/scan/UNKNOWN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.result.status").value("not_found"));
  }

  @Test
  void scan_is_public_no_auth_required() throws Exception {
    when(scanService.scanFood(eq("FT-QR-1001"), any())).thenReturn(Map.of(
        "codeString", "FT-QR-1001", "status", "safe", "title", "t", "summary", "s"));

    // No Authorization header — should still return 200
    mockMvc.perform(get("/api/scan/FT-QR-1001"))
        .andExpect(status().isOk());
  }

  @Test
  void report_requires_authentication() throws Exception {
    mockMvc.perform(post("/api/scan/FT-QR-1001/report")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"description":"This product made me sick, very suspicious smell"}
                """))
        .andExpect(status().isUnauthorized());
  }
}
