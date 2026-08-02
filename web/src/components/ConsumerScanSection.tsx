import { useState } from "react";
import type { AuthResponse, ProductScanResult, SubmitConsumerReportResponse } from "@foodtrace/shared";
import { apiBase, readJsonResponse, getFriendlyErrorMessage, showDemoMode, fetchWithTimeout } from "../lib/api";
import { styles } from "../lib/styles";
import { sampleCodes } from "../lib/constants";
import { SafetyRing, statusToRingStatus } from "./SafetyRing";

interface Props {
  session: AuthResponse | null;
  scanCode: string;
  setScanCode: (v: string) => void;
  scanResult: ProductScanResult | null;
  scanLoading: boolean;
  scanStatus: string;
  onScan: () => void;
}

export function ConsumerScanSection({ session, scanCode, setScanCode, scanResult, scanLoading, scanStatus, onScan }: Props) {
  const [reportDescription, setReportDescription] = useState("The product looks damaged and the label is unclear.");
  const [reportDistrict, setReportDistrict] = useState("Accra");
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportStatusText, setReportStatusText] = useState("Ready to submit a consumer report");

  async function submitConsumerReport() {
    const code = (scanResult?.codeString ?? scanCode).trim();
    if (!session?.token) { setReportStatusText("Log in as a consumer first."); return; }
    if (!code) { setReportStatusText("Scan a product before reporting."); return; }

    setReportStatusText("Submitting report...");
    try {
      const body = new FormData();
      body.append("description", reportDescription);
      body.append("district", reportDistrict);
      if (reportPhoto) body.append("photo", reportPhoto);

      const response = await fetchWithTimeout(`${apiBase}/scan/${encodeURIComponent(code)}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body,
      });
      const data = (await readJsonResponse(response)) as SubmitConsumerReportResponse & { error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not submit report");

      setReportStatusText(`Report submitted: ${data.report.status}`);
      setReportPhoto(null);
    } catch (error) {
      setReportStatusText(error instanceof Error ? error.message : "Could not submit report");
    }
  }

  return (
    <section style={styles.scanCard}>
      <p style={styles.scanKicker}>Consumer scan</p>
      <h2 style={styles.scanTitle}>Check a code and see the safety result.</h2>
      <p style={styles.scanBody}>
        Enter a QR or batch code from a package. The backend returns a status, summary, and recommended action.
      </p>
      <div style={styles.scanInputRow}>
        <input
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          style={styles.scanInput}
          placeholder="FT-QR-1001"
        />
        <button type="button" style={styles.primaryButton} onClick={onScan} disabled={scanLoading}>
          {scanLoading ? "Scanning..." : "Scan"}
        </button>
      </div>
      {showDemoMode ? (
        <div style={styles.sampleRow}>
          {sampleCodes.map((code) => (
            <button key={code} type="button" style={styles.sampleButton} onClick={() => { setScanCode(code); onScan(); }}>
              {code}
            </button>
          ))}
        </div>
      ) : null}
      <p style={styles.status}>{scanStatus}</p>
      {scanResult ? (
        <article style={styles.resultCard}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <SafetyRing status={statusToRingStatus(scanResult.status)} />
          </div>
          <h3 style={{ ...styles.resultTitle, textAlign: "center" }}>{scanResult.title}</h3>
          {scanResult.imageUrl ? (
            <img
              src={scanResult.imageUrl}
              alt={scanResult.title}
              style={{ display: "block", width: "100%", maxWidth: 320, maxHeight: 220, objectFit: "cover", borderRadius: 14, margin: "0 auto 14px" }}
            />
          ) : null}
          <p style={styles.resultSummary}>{scanResult.summary}</p>
          <dl className="app-grid-2" style={styles.resultGrid}>
            <div><dt style={{ color: "#93b9ac" }}>Batch</dt><dd style={{ color: "#f4f4ef" }}>{scanResult.batchNumber ?? "N/A"}</dd></div>
            <div><dt style={{ color: "#93b9ac" }}>Manufacturer</dt><dd style={{ color: "#f4f4ef" }}>{scanResult.manufacturerName ?? "N/A"}</dd></div>
            <div><dt style={{ color: "#93b9ac" }}>Packaging</dt><dd style={{ color: "#f4f4ef" }}>{scanResult.packagingDate ?? "N/A"}</dd></div>
            <div><dt style={{ color: "#93b9ac" }}>Expiry</dt><dd style={{ color: "#f4f4ef" }}>{scanResult.expiryDate ?? "N/A"}</dd></div>
          </dl>
          <p style={styles.action}>{scanResult.recommendedAction}</p>
          <p style={{ fontSize: 11, lineHeight: 1.5, color: "#748089", marginTop: 10 }}>
            Product safety information is sourced from the Ghana FDA public register. FoodTrace GH is not
            affiliated with or endorsed by the Ghana FDA. Always consult a qualified health professional
            before making decisions about medicines.
          </p>
        </article>
      ) : null}
      <article style={styles.resultCard}>
        <h3 style={styles.resultTitle}>Report concern</h3>
        <p style={styles.resultSummary}>Add a description and attach a photo so the consumer report is ready for review.</p>
        <div className="app-grid-2" style={styles.foodFormGrid}>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            style={{ ...styles.scanInput, minHeight: 110, gridColumn: "1 / -1" }}
            placeholder="Describe the issue"
          />
          <input value={reportDistrict} onChange={(e) => setReportDistrict(e.target.value)} style={styles.scanInput} placeholder="District" />
          <input type="file" accept="image/*" onChange={(e) => setReportPhoto(e.target.files?.[0] ?? null)} style={styles.scanInput} />
        </div>
        <button
          type="button"
          style={styles.primaryButton}
          disabled={reportStatusText === "Submitting report..."}
          onClick={() => void submitConsumerReport()}
        >
          Submit consumer report
        </button>
        <p style={styles.status}>{reportStatusText}</p>
      </article>
    </section>
  );
}
