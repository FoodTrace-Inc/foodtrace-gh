package com.foodtrace.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class SchemaRepairRunnerTest {

  @Test
  void keeps_semicolons_inside_single_quoted_strings() {
    // Regression: a semicolon inside a string literal (e.g. free text or a
    // data URI) must not split the statement.
    String sql = "INSERT INTO t (a) VALUES ('Neurotoxic; restricted to trained applicators only'); "
        + "INSERT INTO t (a) VALUES ('ok');";
    List<String> parts = SchemaRepairRunner.splitStatements(sql);
    assertEquals(2, parts.size());
    assertTrue(parts.get(0).contains("Neurotoxic; restricted"));
  }

  @Test
  void keeps_base64_data_uri_semicolon_intact() {
    // data:image/jpeg;base64,... has a semicolon in the MIME type.
    String sql = "UPDATE t SET img = 'data:image/jpeg;base64,ABC123==' WHERE id = 1;";
    List<String> parts = SchemaRepairRunner.splitStatements(sql);
    assertEquals(1, parts.size());
    assertTrue(parts.get(0).contains("data:image/jpeg;base64,ABC123=="));
  }

  @Test
  void handles_escaped_doubled_quotes() {
    String sql = "INSERT INTO t (a) VALUES ('O''Brien; farm'); INSERT INTO t (a) VALUES ('x');";
    List<String> parts = SchemaRepairRunner.splitStatements(sql);
    assertEquals(2, parts.size());
    assertTrue(parts.get(0).contains("O''Brien; farm"));
  }

  @Test
  void still_splits_normal_statements_and_keeps_dollar_blocks() {
    String sql = "CREATE TABLE a (id int); "
        + "DO $$ BEGIN IF true THEN NULL; END IF; END $$; "
        + "CREATE TABLE b (id int);";
    List<String> parts = SchemaRepairRunner.splitStatements(sql);
    assertEquals(3, parts.size());
    assertTrue(parts.get(1).contains("DO $$"));
    assertTrue(parts.get(1).contains("END IF; END"));
  }

  @Test
  void strips_line_comments_outside_strings_but_not_inside() {
    String sql = "SELECT 1; -- a trailing comment\nSELECT '-- not a comment';";
    List<String> parts = SchemaRepairRunner.splitStatements(sql);
    assertEquals(2, parts.size());
    assertTrue(parts.get(1).contains("'-- not a comment'"));
  }
}
