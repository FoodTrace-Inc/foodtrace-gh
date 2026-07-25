package com.foodtrace.api.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Part C: every product_batch/drug_batch already gets a QR code the moment
 * it's created (see ManufacturerService/DrugService, which call
 * QrCodeService.generateAndSave and insert into qr_codes/drug_qr_codes
 * inline). This service is the safety net for the case those two paths are
 * meant to prevent entirely: a batch that somehow exists with no QR row —
 * e.g. inserted directly via a seed script that skipped QrCodeService, or
 * left over from a partially-failed request. Finds any such batch and
 * generates one, using the exact same code-string format and PNG generator
 * the normal creation flow uses, so backfilled codes are indistinguishable
 * from ones created the regular way.
 */
@Service
public class QrBackfillService {
  private final JdbcClient jdbc;
  private final QrCodeService qrCodeService;

  public QrBackfillService(JdbcClient jdbc, QrCodeService qrCodeService) {
    this.jdbc = jdbc;
    this.qrCodeService = qrCodeService;
  }

  public Map<String, Object> backfill() {
    List<Map<String, Object>> missingFood = jdbc.sql("""
        SELECT pb.id, pb.batch_number FROM product_batches pb
        LEFT JOIN qr_codes q ON q.batch_id = pb.id
        WHERE q.id IS NULL
        """).query().listOfRows();

    List<Map<String, Object>> missingDrug = jdbc.sql("""
        SELECT db.id, db.batch_number FROM drug_batches db
        LEFT JOIN drug_qr_codes q ON q.drug_batch_id = db.id
        WHERE q.id IS NULL
        """).query().listOfRows();

    int foodCreated = 0;
    for (Map<String, Object> row : missingFood) {
      createFoodQr(UUID.fromString(String.valueOf(row.get("id"))), String.valueOf(row.get("batch_number")));
      foodCreated++;
    }
    int drugCreated = 0;
    for (Map<String, Object> row : missingDrug) {
      createDrugQr(UUID.fromString(String.valueOf(row.get("id"))), String.valueOf(row.get("batch_number")));
      drugCreated++;
    }

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("foodBatchesMissingQr", missingFood.size());
    summary.put("foodQrCreated", foodCreated);
    summary.put("drugBatchesMissingQr", missingDrug.size());
    summary.put("drugQrCreated", drugCreated);
    return summary;
  }

  private void createFoodQr(UUID batchId, String batchNumber) {
    String codeString = "FT-" + batchNumber.toUpperCase().replaceAll("[^A-Z0-9]", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String qrUrl = qrCodeService.generateAndSave(codeString);
    jdbc.sql("INSERT INTO qr_codes (batch_id, code_string, s3_url) VALUES (CAST(:batchId AS uuid), :codeString, :url)")
        .param("batchId", batchId.toString())
        .param("codeString", codeString)
        .param("url", qrUrl)
        .update();
  }

  private void createDrugQr(UUID batchId, String batchNumber) {
    String codeString = "DR-" + batchNumber.toUpperCase().replaceAll("[^A-Z0-9]", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String qrUrl = qrCodeService.generateAndSave(codeString);
    jdbc.sql("INSERT INTO drug_qr_codes (drug_batch_id, code_string, s3_url) VALUES (CAST(:batchId AS uuid), :codeString, :url)")
        .param("batchId", batchId.toString())
        .param("codeString", codeString)
        .param("url", qrUrl)
        .update();
  }
}
