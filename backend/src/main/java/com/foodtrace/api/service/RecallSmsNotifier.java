package com.foodtrace.api.service;

import com.foodtrace.api.sms.SmsSender;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Sends an SMS alert to the people affected by a recall the moment it's activated.
 * Food batches notify the farmers whose ingredients went into the batch (from
 * ingredient_sources) plus the manufacturer; drug batches notify the pharmacy.
 * Delivery failures are swallowed by SmsSender itself and never affect the recall.
 */
@Service
public class RecallSmsNotifier {
  private final JdbcClient jdbc;
  private final SmsSender smsSender;

  public RecallSmsNotifier(JdbcClient jdbc, SmsSender smsSender) {
    this.jdbc = jdbc;
    this.smsSender = smsSender;
  }

  public void notifyFoodRecall(UUID batchId, String reason) {
    String productName = jdbc.sql("SELECT product_name FROM product_batches WHERE id = :id")
        .param("id", batchId).query(String.class).optional().orElse("A product");

    List<String> phones = jdbc.sql("""
        SELECT DISTINCT u.phone
        FROM product_batches pb
        CROSS JOIN LATERAL jsonb_array_elements(pb.ingredient_sources) elem
        JOIN users u ON u.id = (elem->>'farmerId')::uuid
        WHERE pb.id = :id AND elem->>'farmerId' IS NOT NULL AND u.phone IS NOT NULL
        UNION
        SELECT DISTINCT u.phone
        FROM product_batches pb
        JOIN manufacturers m ON m.id = pb.manufacturer_id
        JOIN users u ON u.id = m.user_id
        WHERE pb.id = :id AND u.phone IS NOT NULL
        """)
        .param("id", batchId)
        .query(String.class)
        .list();

    String message = "FoodTrace GH ALERT: " + productName + " has been recalled. Reason: " + reason
        + ". Stop selling or using this product immediately.";
    for (String phone : phones) smsSender.send(phone, message);
  }

  public void notifyDrugRecall(UUID batchId, String reason) {
    List<String> phones = jdbc.sql("""
        SELECT DISTINCT u.phone
        FROM drug_batches db
        JOIN drugs d ON d.id = db.drug_id
        JOIN pharmacies p ON p.id = db.pharmacy_id
        JOIN users u ON u.id = p.user_id
        WHERE db.id = :id AND u.phone IS NOT NULL
        """)
        .param("id", batchId)
        .query(String.class)
        .list();

    String drugName = jdbc.sql("""
        SELECT d.name FROM drug_batches db JOIN drugs d ON d.id = db.drug_id WHERE db.id = :id
        """).param("id", batchId).query(String.class).optional().orElse("A medicine");

    String message = "FoodTrace GH ALERT: " + drugName + " has been recalled. Reason: " + reason
        + ". Do not dispense this medicine.";
    for (String phone : phones) smsSender.send(phone, message);
  }
}
