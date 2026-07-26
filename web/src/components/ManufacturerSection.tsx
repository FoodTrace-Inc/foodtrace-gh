import { useEffect, useState } from "react";
import type {
  AuthResponse,
  CreateManufacturerProfileRequest,
  CreateProductBatchRequest,
  CreateProductBatchResponse,
  CreateRecallRequest,
  ManufacturerDashboardResponse,
} from "@foodtrace/shared";
import { apiBase, readJsonResponse, resolveAssetUrl } from "../lib/api";
import { MetricCards } from "./MetricCards";
import { styles } from "../lib/styles";

interface Props {
  session: AuthResponse;
}

export function ManufacturerSection({ session }: Props) {
  const [manufacturerDashboard, setManufacturerDashboard] = useState<ManufacturerDashboardResponse | null>(null);
  const [manufacturerStatus, setManufacturerStatus] = useState("Manufacturer portal ready");
  const [companyName, setCompanyName] = useState("FoodTrace Foods Ltd");
  const [fdaRegNumber, setFdaRegNumber] = useState("FDA-12345");
  const [manufacturerSector, setManufacturerSector] = useState("food");
  const [subscriptionTier, setSubscriptionTier] = useState<"micro" | "small" | "medium" | "large">("small");
  const [batchNumber, setBatchNumber] = useState("FB-1001");
  const [batchProductName, setBatchProductName] = useState("Tomato Paste 400g");
  const [batchFarmOrigin, setBatchFarmOrigin] = useState("Ejisu, Ashanti");
  const [packagingDate, setPackagingDate] = useState("2026-05-01");
  const [expiryDate, setExpiryDate] = useState("2027-05-01");
  const [ingredientSources, setIngredientSources] = useState("farm inputs");
  const [processingSteps, setProcessingSteps] = useState("mix,heat,pack");
  const [qualityChecks, setQualityChecks] = useState("visual pass");
  const [recallBatchId, setRecallBatchId] = useState("");
  const [recallReason, setRecallReason] = useState("Possible contamination");
  const [recallType, setRecallType] = useState<"manufacturer" | "regulator">("manufacturer");
  const [recallScopeDistricts, setRecallScopeDistricts] = useState("Accra,Kumasi");
  const [latestCreatedQr, setLatestCreatedQr] = useState<CreateProductBatchResponse["qrCode"] | null>(null);

  useEffect(() => { void loadManufacturerDashboard(); }, []);

  async function loadManufacturerDashboard() {
    setManufacturerStatus("Loading manufacturer dashboard...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await readJsonResponse(response)) as { dashboard: ManufacturerDashboardResponse; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load manufacturer dashboard");

      setManufacturerDashboard(data.dashboard);
      setManufacturerStatus(data.dashboard.profile ? "Manufacturer dashboard loaded." : "Create a manufacturer profile to continue.");
      if (!recallBatchId && data.dashboard.batches[0]?.id) setRecallBatchId(data.dashboard.batches[0].id);
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not load manufacturer dashboard");
    }
  }

  async function createManufacturerProfile() {
    const payload: CreateManufacturerProfileRequest = {
      companyName,
      fdaRegistrationNumber: fdaRegNumber || null,
      sector: manufacturerSector,
      subscriptionTier,
    };
    setManufacturerStatus("Creating manufacturer profile...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(payload),
      });
      const data = (await readJsonResponse(response)) as { error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create manufacturer profile");
      setManufacturerStatus("Manufacturer profile created.");
      await loadManufacturerDashboard();
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not create manufacturer profile");
    }
  }

  async function createManufacturerBatch() {
    const payload: CreateProductBatchRequest = {
      batchNumber,
      productName: batchProductName,
      farmOrigin: batchFarmOrigin,
      ingredientSources: [ingredientSources],
      processingSteps: processingSteps.split(",").map((s) => s.trim()).filter(Boolean),
      qualityChecks: [qualityChecks],
      packagingDate,
      expiryDate,
    };
    setManufacturerStatus("Creating batch and QR...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(payload),
      });
      const data = (await readJsonResponse(response)) as CreateProductBatchResponse & { error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create batch");
      setManufacturerStatus(`Batch created. QR: ${data.qrCode.codeString}`);
      setLatestCreatedQr(data.qrCode);
      await loadManufacturerDashboard();
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not create batch");
    }
  }

  async function copyLatestQrCode() {
    if (!latestCreatedQr?.codeString) { setManufacturerStatus("Create a batch first to get a QR code."); return; }
    try {
      await navigator.clipboard.writeText(latestCreatedQr.codeString);
      setManufacturerStatus(`Copied QR code ${latestCreatedQr.codeString}.`);
    } catch {
      setManufacturerStatus(`QR code: ${latestCreatedQr.codeString}`);
    }
  }

  async function createManufacturerRecall() {
    const payload: CreateRecallRequest = {
      batchId: recallBatchId,
      recallType,
      reason: recallReason,
      scopeDistricts: recallScopeDistricts.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setManufacturerStatus("Creating recall...");
    try {
      const response = await fetch(`${apiBase}/manufacturer/recalls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(payload),
      });
      const data = (await readJsonResponse(response)) as { error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create recall");
      setManufacturerStatus("Recall created.");
      await loadManufacturerDashboard();
    } catch (error) {
      setManufacturerStatus(error instanceof Error ? error.message : "Could not create recall");
    }
  }

  return (
    <section style={styles.foodCard}>
      <p style={styles.scanKicker}>Manufacturer portal</p>
      <h2 style={styles.scanTitle}>Batch creation, QR generation, and recalls.</h2>
      <p style={styles.scanBody}>
        Create a profile first, then build batches, produce QR labels, and issue recalls when needed.
      </p>
      <div style={styles.foodButtons}>
        <button type="button" style={styles.primaryButton} onClick={() => void loadManufacturerDashboard()}>Load manufacturer dashboard</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerProfile()}>Create profile</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerBatch()}>Create batch</button>
        <button type="button" style={styles.sampleButton} onClick={() => void createManufacturerRecall()}>Issue recall</button>
      </div>
      <div className="app-grid-2" style={styles.foodFormGrid}>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.scanInput} placeholder="Company name" />
        <input value={fdaRegNumber} onChange={(e) => setFdaRegNumber(e.target.value)} style={styles.scanInput} placeholder="FDA registration number" />
        <input value={manufacturerSector} onChange={(e) => setManufacturerSector(e.target.value)} style={styles.scanInput} placeholder="Sector" />
        <select value={subscriptionTier} onChange={(e) => setSubscriptionTier(e.target.value as typeof subscriptionTier)} style={styles.scanInput}>
          <option value="micro">micro</option>
          <option value="small">small</option>
          <option value="medium">medium</option>
          <option value="large">large</option>
        </select>
        <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={styles.scanInput} placeholder="Batch number" />
        <input value={batchProductName} onChange={(e) => setBatchProductName(e.target.value)} style={styles.scanInput} placeholder="Product name" />
        <input value={batchFarmOrigin} onChange={(e) => setBatchFarmOrigin(e.target.value)} style={styles.scanInput} placeholder="Farm origin" />
        <input value={packagingDate} onChange={(e) => setPackagingDate(e.target.value)} style={styles.scanInput} placeholder="Packaging date YYYY-MM-DD" />
        <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={styles.scanInput} placeholder="Expiry date YYYY-MM-DD" />
        <input value={recallBatchId} onChange={(e) => setRecallBatchId(e.target.value)} style={styles.scanInput} placeholder="Recall batch ID" />
        <input value={recallReason} onChange={(e) => setRecallReason(e.target.value)} style={styles.scanInput} placeholder="Recall reason" />
        <input value={ingredientSources} onChange={(e) => setIngredientSources(e.target.value)} style={styles.scanInput} placeholder="Ingredient sources" />
        <input value={processingSteps} onChange={(e) => setProcessingSteps(e.target.value)} style={styles.scanInput} placeholder="Processing steps comma separated" />
        <input value={qualityChecks} onChange={(e) => setQualityChecks(e.target.value)} style={styles.scanInput} placeholder="Quality checks" />
        <input value={recallScopeDistricts} onChange={(e) => setRecallScopeDistricts(e.target.value)} style={styles.scanInput} placeholder="Recall scope districts comma separated" />
        <select value={recallType} onChange={(e) => setRecallType(e.target.value as typeof recallType)} style={styles.scanInput}>
          <option value="manufacturer">manufacturer</option>
          <option value="regulator">regulator</option>
        </select>
      </div>
      <p style={styles.status}>{manufacturerStatus}</p>
      {latestCreatedQr ? (
        <article className="qr-print-label" style={styles.qrCard}>
          <div>
            <p style={styles.scanKicker}>Generated QR</p>
            <h3 style={styles.resultTitle}>{latestCreatedQr.codeString}</h3>
            <p style={styles.resultSummary}>Use this QR code on the batch label. A consumer scan will resolve to the batch safety record.</p>
            <div style={styles.foodButtons}>
              <button type="button" style={styles.sampleButton} onClick={() => void copyLatestQrCode()}>Copy code</button>
              {resolveAssetUrl(latestCreatedQr.url) ? (
                <a style={styles.linkButton} href={resolveAssetUrl(latestCreatedQr.url) ?? undefined} download>Download QR</a>
              ) : null}
              <button type="button" style={styles.sampleButton} onClick={() => window.print()}>Print label</button>
            </div>
          </div>
          {resolveAssetUrl(latestCreatedQr.url) ? (
            <img src={resolveAssetUrl(latestCreatedQr.url) ?? undefined} alt={`FoodTrace QR code ${latestCreatedQr.codeString}`} style={styles.qrImage} />
          ) : null}
        </article>
      ) : null}
      {manufacturerDashboard ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Manufacturer metrics</h3>
          <MetricCards
            metrics={[
              { label: "Batches", value: manufacturerDashboard.metrics.batches },
              { label: "QR codes", value: manufacturerDashboard.metrics.qrCodes },
              { label: "Recalls", value: manufacturerDashboard.metrics.recalls },
              { label: "Active recalls", value: manufacturerDashboard.metrics.activeRecalls },
            ]}
          />
          <p style={{ ...styles.resultSummary, marginTop: 14 }}>Profile: {manufacturerDashboard.profile?.companyName ?? "No profile yet"}</p>
          <p style={styles.resultSummary}>Latest batch: {manufacturerDashboard.batches[0]?.batchNumber ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest QR: {manufacturerDashboard.batches[0]?.qrCode ?? "None yet"}</p>
          <p style={styles.resultSummary}>Latest recall: {manufacturerDashboard.recalls[0]?.reason ?? "None yet"}</p>
        </article>
      ) : null}
      {manufacturerDashboard && manufacturerDashboard.batches.length > 0 ? (() => {
        const counts: Record<string, number> = { active: 0, recalled: 0, under_investigation: 0, expired: 0 };
        manufacturerDashboard.batches.forEach((b) => { counts[b.recallStatus] = (counts[b.recallStatus] ?? 0) + 1; });
        const total = manufacturerDashboard.batches.length;
        const segments: [string, number, string][] = [
          ["Active", counts.active, "#4ade80"],
          ["Under investigation", counts.under_investigation, "#E0A83B"],
          ["Recalled", counts.recalled, "#f87171"],
          ["Expired", counts.expired, "#5F5E5A"],
        ];
        return (
          <article style={styles.resultCard}>
            <p style={styles.scanKicker}>Batch pipeline</p>
            <div style={styles.pipelineBar}>
              {segments.filter(([, count]) => count > 0).map(([label, count, color]) => (
                <div key={label} style={{ flex: count, background: color }} />
              ))}
            </div>
            <div style={styles.pipelineLegendRow}>
              {segments.map(([label, count, color]) => (
                <div key={label} style={styles.pipelineLegendItem}>
                  <span style={{ ...styles.pipelineDot, background: color }} />
                  <p style={styles.pipelineLegendText}>{label} · {count}</p>
                </div>
              ))}
            </div>
            <p style={styles.pipelineTotal}>{total} batch{total === 1 ? "" : "es"} tracked</p>
          </article>
        );
      })() : null}

      {manufacturerDashboard && manufacturerDashboard.batches.length > 0 ? (
        <article style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Your batches</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginTop: 10 }}>
            {manufacturerDashboard.batches.map((b) => {
              const gradient = BATCH_STATUS_GRADIENT[b.recallStatus] ?? BATCH_STATUS_GRADIENT.active;
              return (
                <div key={b.id} style={{ background: gradient.bg, borderRadius: 16, padding: 13 }}>
                  <p style={{ color: gradient.text, fontSize: 12.5, fontWeight: 700, margin: "0 0 4px" }}>{b.qrCode || b.batchNumber}</p>
                  <p style={{ color: gradient.sub, fontSize: 10.5, margin: "0 0 8px" }}>{b.productName || "Unnamed product"}</p>
                  <span style={{ background: gradient.pillBg, color: gradient.pillFg, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 999, textTransform: "capitalize" }}>
                    {b.recallStatus.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}
    </section>
  );
}

const BATCH_STATUS_GRADIENT: Record<string, { bg: string; text: string; sub: string; pillBg: string; pillFg: string }> = {
  active: { bg: "linear-gradient(160deg, #d4f5e8 0%, #8fe0c0 100%)", text: "#0a3324", sub: "#1a5c42", pillBg: "rgba(10,50,36,0.85)", pillFg: "#9ce8bd" },
  under_investigation: { bg: "linear-gradient(160deg, #fff3b0 0%, #ffdd6b 100%)", text: "#4a3400", sub: "#6b5210", pillBg: "rgba(140,90,10,0.85)", pillFg: "#ffe1a3" },
  recalled: { bg: "linear-gradient(160deg, #ffd6d6 0%, #ff9d9d 100%)", text: "#5c0f0f", sub: "#8a2c2c", pillBg: "rgba(92,15,15,0.85)", pillFg: "#ffc0c0" },
  expired: { bg: "linear-gradient(160deg, #e4e4e4 0%, #c2c2c2 100%)", text: "#2c2c2c", sub: "#4a4a4a", pillBg: "rgba(40,40,40,0.85)", pillFg: "#d6d6d6" },
};
