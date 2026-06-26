package com.foodtrace.api.controller;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Temporary diagnostic endpoint to inspect the live database schema while
 * debugging the Render column-mismatch issue. Public (whitelisted in
 * SecurityConfig) and read-only. Remove once the schema is confirmed correct.
 */
@RestController
@RequestMapping("/api/diag")
public class DiagController {
  private final JdbcClient jdbc;

  public DiagController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/columns")
  public Map<String, Object> columns(@RequestParam(defaultValue = "manufacturers") String table) {
    List<Map<String, Object>> cols = jdbc.sql(
            "SELECT column_name, data_type, table_schema FROM information_schema.columns WHERE table_name = :t ORDER BY table_schema, ordinal_position")
        .param("t", table)
        .query((rs, n) -> Map.<String, Object>of(
            "schema", rs.getString("table_schema"),
            "column", rs.getString("column_name"),
            "type", rs.getString("data_type")))
        .list();
    String currentSchema = jdbc.sql("SELECT current_schema()").query(String.class).single();
    String searchPath = jdbc.sql("SHOW search_path").query(String.class).single();
    String database = jdbc.sql("SELECT current_database()").query(String.class).single();
    return Map.of(
        "table", table,
        "database", database,
        "currentSchema", currentSchema,
        "searchPath", searchPath,
        "columnCount", cols.size(),
        "columns", cols);
  }
}
