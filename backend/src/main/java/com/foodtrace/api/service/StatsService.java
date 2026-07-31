package com.foodtrace.api.service;

import java.time.Instant;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Powers the "Ghana has made N safe product scans" counter on the consumer
 * home screen. Cached for 60s in memory (single field, not a distributed
 * cache) since this app runs as one Render instance and the number only
 * needs to feel roughly live, not be transactionally exact.
 */
@Service
public class StatsService {
  private final JdbcClient jdbc;
  private volatile Map<String, Object> cached;
  private volatile Instant cachedAt = Instant.EPOCH;

  public StatsService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> totalScans() {
    if (cached != null && Instant.now().isBefore(cachedAt.plusSeconds(60))) {
      return cached;
    }
    Map<String, Object> row = jdbc.sql("""
        SELECT
          (SELECT COUNT(*) FROM consumer_scans) + (SELECT COUNT(*) FROM drug_consumer_scans) AS total_scans,
          (
            SELECT COUNT(*) FROM consumer_scans cs
            JOIN qr_codes q ON q.id = cs.qr_code_id
            JOIN product_batches pb ON pb.id = q.batch_id
            WHERE pb.recall_status <> 'recalled' AND pb.expiry_date >= CURRENT_DATE
          ) + (
            SELECT COUNT(*) FROM drug_consumer_scans dcs
            JOIN drug_qr_codes dq ON dq.id = dcs.drug_qr_code_id
            JOIN drug_batches db ON db.id = dq.drug_batch_id
            WHERE db.recall_status <> 'recalled' AND db.expiry_date >= CURRENT_DATE
          ) AS safe_scans
        """)
        .query(DatabaseRowMapper::toMap)
        .single();
    cached = Map.of(
        "totalScans", ((Number) row.getOrDefault("totalScans", 0)).longValue(),
        "safeScans", ((Number) row.getOrDefault("safeScans", 0)).longValue());
    cachedAt = Instant.now();
    return cached;
  }
}
