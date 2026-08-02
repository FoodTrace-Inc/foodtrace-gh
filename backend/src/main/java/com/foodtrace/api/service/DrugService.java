package com.foodtrace.api.service;

import com.foodtrace.api.payments.SubscriptionLimitService;
import com.foodtrace.api.security.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DrugService {
  private final JdbcClient jdbc;
  private final QrCodeService qrCodeService;
  private final NotificationService notifications;
  private final AuditLogService auditLog;
  private final SubscriptionLimitService subscriptionLimits;

  public DrugService(JdbcClient jdbc, QrCodeService qrCodeService, NotificationService notifications, AuditLogService auditLog, SubscriptionLimitService subscriptionLimits) {
    this.jdbc = jdbc;
    this.qrCodeService = qrCodeService;
    this.notifications = notifications;
    this.auditLog = auditLog;
    this.subscriptionLimits = subscriptionLimits;
  }

  public Map<String, Object> dashboard(CurrentUser user) {
    Map<String, Object> pharmacy = jdbc.sql("""
        SELECT id, business_name, ghana_pharmacy_council_number, district, region, is_verified
        FROM pharmacies WHERE user_id = :uid LIMIT 1
        """)
        .param("uid", user.id())
        .query(DatabaseRowMapper::toMap).optional().orElse(null);

    String pharmacyId = pharmacy != null ? String.valueOf(pharmacy.get("id")) : null;

    // drugs is a shared FDA catalog, not owned per-pharmacy - it exists here so
    // a pharmacist can pick a drugId to attach a new batch to. Scoping this to
    // "drugs this pharmacy already has a batch for" (the old INNER JOIN) made a
    // freshly created drug invisible until a batch existed for it, which made
    // batch creation for that drug permanently unreachable.
    List<Map<String, Object>> drugs = jdbc.sql("""
        SELECT id, name, generic_name, drug_class, dosage_form, strength,
               requires_prescription, fda_approval_status
        FROM drugs
        ORDER BY created_at DESC
        LIMIT 200
        """)
        .query(DatabaseRowMapper::toMap).list();

    List<Map<String, Object>> batches = pharmacyId == null ? List.of() : jdbc.sql("""
        SELECT db.id, db.batch_number, db.expiry_date, db.quantity_received, db.quantity_remaining,
               db.recall_status, d.name AS drug_name,
               (SELECT q.code_string FROM drug_qr_codes q WHERE q.drug_batch_id = db.id LIMIT 1) AS qr_code
        FROM drug_batches db
        JOIN drugs d ON d.id = db.drug_id
        WHERE db.pharmacy_id = :pid
        ORDER BY db.created_at DESC
        """)
        .param("pid", UUID.fromString(pharmacyId))
        .query(DatabaseRowMapper::toMap).list();

    List<Map<String, Object>> recalls = pharmacyId == null ? List.of() : jdbc.sql("""
        SELECT dre.id, dre.reason, dre.created_at, db.batch_number, d.name AS drug_name
        FROM drug_recall_events dre
        JOIN drug_batches db ON db.id = dre.drug_batch_id
        JOIN drugs d ON d.id = db.drug_id
        WHERE db.pharmacy_id = :pid
        ORDER BY dre.created_at DESC
        """)
        .param("pid", UUID.fromString(pharmacyId))
        .query(DatabaseRowMapper::toMap).list();

    long qrCount = pharmacyId == null ? 0 : jdbc.sql("""
        SELECT COUNT(q.id) FROM drug_qr_codes q
        JOIN drug_batches db ON db.id = q.drug_batch_id
        WHERE db.pharmacy_id = :pid
        """)
        .param("pid", UUID.fromString(pharmacyId))
        .query(Long.class).single();

    Map<String, Object> metrics = Map.of(
        "drugs", drugs.size(),
        "batches", batches.size(),
        "qrCodes", qrCount,
        "recalls", recalls.size());

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("pharmacy", pharmacy);
    result.put("drugs", drugs);
    result.put("batches", batches);
    result.put("recalls", recalls);
    result.put("metrics", metrics);
    return Map.of("dashboard", result);
  }

  /** Part F: every QR code this pharmacy has generated, with its download image and scan count, for the QR management page. */
  public Map<String, Object> qrCodes(CurrentUser user) {
    String pharmacyId = jdbc.sql("SELECT id FROM pharmacies WHERE user_id = :uid LIMIT 1")
        .param("uid", user.id())
        .query(String.class)
        .optional().orElse(null);
    if (pharmacyId == null) return Map.of("qrCodes", List.of());

    List<Map<String, Object>> rows = jdbc.sql("""
        SELECT q.id, q.code_string, q.s3_url, q.scan_count, q.status,
               db.batch_number, d.name AS product_name, db.recall_status
        FROM drug_qr_codes q
        JOIN drug_batches db ON db.id = q.drug_batch_id
        JOIN drugs d ON d.id = db.drug_id
        WHERE db.pharmacy_id = CAST(:pid AS uuid)
        ORDER BY db.created_at DESC
        """)
        .param("pid", pharmacyId)
        .query(DatabaseRowMapper::toMap)
        .list();
    return Map.of("qrCodes", rows);
  }

  public Map<String, Object> registerPharmacy(CurrentUser user, Map<String, Object> body) {
    Validate.require(body, "businessName", "ghanaPharmacyCouncilNumber", "district", "region");
    boolean exists = jdbc.sql("SELECT 1 FROM pharmacies WHERE user_id = :uid")
        .param("uid", user.id()).query(Integer.class).optional().isPresent();
    if (exists) throw new ResponseStatusException(HttpStatus.CONFLICT, "Pharmacy already registered");

    Map<String, Object> pharmacy = jdbc.sql("""
        INSERT INTO pharmacies (user_id, business_name, ghana_pharmacy_council_number, district, region)
        VALUES (:uid, :businessName, :gpcNumber, :district, :region)
        RETURNING id, business_name, ghana_pharmacy_council_number, district, region, is_verified
        """)
        .param("uid", user.id())
        .param("businessName", body.get("businessName"))
        .param("gpcNumber", body.get("ghanaPharmacyCouncilNumber"))
        .param("district", body.get("district"))
        .param("region", body.get("region"))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("pharmacy", pharmacy);
  }

  public Map<String, Object> createDrug(CurrentUser user, Map<String, Object> body) {
    Validate.require(body, "name");
    requirePharmacy(user);
    Map<String, Object> drug = jdbc.sql("""
        INSERT INTO drugs
          (name, generic_name, manufacturer_name, fda_drug_registration_number,
           drug_class, dosage_form, strength, requires_prescription, is_controlled,
           fda_approval_status, storage_conditions, side_effects_summary)
        VALUES
          (:name, :genericName, :manufacturerName, :fdaDrugReg,
           :drugClass, :dosageForm, :strength, :requiresPrescription, :isControlled,
           CAST(:approvalStatus AS drug_approval_status), :storageConditions, :sideEffects)
        RETURNING id, name, generic_name, drug_class, dosage_form, strength,
                  requires_prescription, fda_approval_status
        """)
        .param("name", body.get("name"))
        .param("genericName", body.get("genericName"))
        .param("manufacturerName", body.get("manufacturerName"))
        .param("fdaDrugReg", body.get("fdaDrugRegistrationNumber"))
        .param("drugClass", body.get("drugClass"))
        .param("dosageForm", body.get("dosageForm"))
        .param("strength", body.get("strength"))
        .param("requiresPrescription", Boolean.TRUE.equals(body.get("requiresPrescription")))
        .param("isControlled", Boolean.TRUE.equals(body.get("isControlled")))
        .param("approvalStatus", body.getOrDefault("fdaApprovalStatus", "under_review"))
        .param("storageConditions", body.get("storageConditions"))
        .param("sideEffects", body.get("sideEffectsSummary"))
        .query(DatabaseRowMapper::toMap).single();
    return Map.of("drug", drug);
  }

  public Map<String, Object> createBatch(CurrentUser user, Map<String, Object> body) {
    Validate.require(body, "drugId", "batchNumber", "manufactureDate", "expiryDate");
    Validate.requirePositiveInt(body, "quantityReceived");
    UUID pharmacyId = requirePharmacy(user);
    UUID drugId = UUID.fromString(String.valueOf(body.get("drugId")));
    String batchNumber = String.valueOf(body.get("batchNumber"));

    int quantityReceived = ((Number) body.getOrDefault("quantityReceived", 0)).intValue();
    // quantityRemaining defaults to the full received count for a brand-new
    // batch (nothing has been dispensed yet) - it must never exceed what was
    // received or go negative, which a free-typed client field could otherwise
    // submit and permanently corrupt this batch's inventory tracking.
    int quantityRemaining = body.get("quantityRemaining") instanceof Number n ? n.intValue() : quantityReceived;
    if (quantityRemaining < 0 || quantityRemaining > quantityReceived) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "quantityRemaining must be between 0 and quantityReceived");
    }

    long currentBatchCount = jdbc.sql("SELECT COUNT(*) FROM drug_batches WHERE pharmacy_id = :pid")
        .param("pid", pharmacyId).query(Long.class).single();
    subscriptionLimits.enforceSellerLimit(user.id(), currentBatchCount);

    Map<String, Object> batch = jdbc.sql("""
        INSERT INTO drug_batches
          (drug_id, pharmacy_id, batch_number, manufacture_date, expiry_date,
           quantity_received, quantity_remaining, supplier_name, image_url)
        VALUES
          (:drugId, :pharmacyId, :batchNumber, CAST(:manufactureDate AS date),
           CAST(:expiryDate AS date), :quantityReceived, :quantityRemaining, :supplierName, :imageUrl)
        RETURNING id, batch_number, manufacture_date, expiry_date,
                  quantity_received, quantity_remaining, recall_status, image_url
        """)
        .param("drugId", drugId)
        .param("pharmacyId", pharmacyId)
        .param("batchNumber", batchNumber)
        .param("manufactureDate", body.get("manufactureDate"))
        .param("expiryDate", body.get("expiryDate"))
        .param("quantityReceived", quantityReceived)
        .param("quantityRemaining", quantityRemaining)
        .param("supplierName", body.get("supplierName"))
        .param("imageUrl", body.get("imageUrl"))
        .query(DatabaseRowMapper::toMap).single();

    UUID batchId = UUID.fromString(String.valueOf(batch.get("id")));
    String codeString = "DR-" + batchNumber.toUpperCase().replaceAll("[^A-Z0-9]", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String qrUrl = qrCodeService.generateAndSave(codeString);

    Map<String, Object> qr = jdbc.sql("""
        INSERT INTO drug_qr_codes (drug_batch_id, code_string, s3_url)
        VALUES (:batchId, :codeString, :url)
        RETURNING id, code_string, s3_url, status, scan_count
        """)
        .param("batchId", batchId)
        .param("codeString", codeString)
        .param("url", qrUrl)
        .query(DatabaseRowMapper::toMap).single();

    Map<String, Object> qrCode = new LinkedHashMap<>();
    qrCode.put("id", qr.get("id"));
    qrCode.put("codeString", qr.get("codeString"));
    qrCode.put("url", qr.get("s3Url"));
    qrCode.put("status", qr.get("status"));

    return Map.of("batch", batch, "qrCode", qrCode);
  }

  public Map<String, Object> createRecall(CurrentUser user, Map<String, Object> body) {
    UUID pharmacyId = requirePharmacy(user);
    Object batchIdRaw = body.get("batchId");
    if (batchIdRaw == null || String.valueOf(batchIdRaw).isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a batch to recall first.");
    }
    String batchId;
    try {
      batchId = UUID.fromString(String.valueOf(batchIdRaw)).toString();
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That batch id is not valid.");
    }
    String reason = String.valueOf(body.getOrDefault("reason", "Pharmacy recall"));

    // Excluding already-recalled batches also guards against a double-click
    // firing two recall_events rows and two rounds of scanner notifications
    // for the same batch.
    boolean alreadyRecalled = jdbc.sql("""
        SELECT 1 FROM drug_batches WHERE id = :id AND pharmacy_id = :pharmacyId AND recall_status = 'recalled'
        """)
        .param("id", UUID.fromString(batchId))
        .param("pharmacyId", pharmacyId)
        .query(Integer.class).optional().isPresent();
    if (alreadyRecalled) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This batch has already been recalled.");
    }
    int updated = jdbc.sql("""
        UPDATE drug_batches SET recall_status = 'recalled'
        WHERE id = :id AND pharmacy_id = :pharmacyId
        """)
        .param("id", UUID.fromString(batchId))
        .param("pharmacyId", pharmacyId)
        .update();
    if (updated == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Drug batch not found");
    }
    jdbc.sql("UPDATE drug_qr_codes SET status = 'recalled' WHERE drug_batch_id = :id")
        .param("id", UUID.fromString(batchId)).update();

    Map<String, Object> recall = jdbc.sql("""
        INSERT INTO drug_recall_events (drug_batch_id, issued_by, reason)
        VALUES (:batchId, :issuedBy, :reason)
        RETURNING id, drug_batch_id, reason, created_at
        """)
        .param("batchId", UUID.fromString(batchId))
        .param("issuedBy", user.id())
        .param("reason", reason)
        .query(DatabaseRowMapper::toMap).single();

    String drugName = jdbc.sql("""
        SELECT d.name FROM drug_batches db JOIN drugs d ON d.id = db.drug_id WHERE db.id = :id
        """)
        .param("id", UUID.fromString(batchId))
        .query(String.class).optional().orElse("A medicine");
    notifications.notifyDrugScannersOfRecall(batchId, drugName);
    auditLog.log(user.id(), "recall.issued", "drug_batch", batchId, Map.of("reason", reason, "issuedBy", "pharmacist"));

    return Map.of("recall", recall);
  }

  private UUID requirePharmacy(CurrentUser user) {
    return jdbc.sql("SELECT id FROM pharmacies WHERE user_id = :uid LIMIT 1")
        .param("uid", user.id()).query(UUID.class).optional()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Register a pharmacy first"));
  }
}
