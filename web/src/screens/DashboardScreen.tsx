import { useState } from "react";
import type { DrugScanResult, ProductScanResult } from "@foodtrace/shared";
import { apiBase, enableDrugModule, getFriendlyErrorMessage, readJsonResponse } from "../lib/api";
import { useSession } from "../session/SessionContext";
import { usePalette } from "../theme/ThemeContext";
import { ConsumerScanSection } from "../components/ConsumerScanSection";
import { FarmerSection } from "../components/FarmerSection";
import { ManufacturerSection } from "../components/ManufacturerSection";
import { RegulatorSection } from "../components/RegulatorSection";
import { DrugSection } from "../components/DrugSection";

export function DashboardScreen() {
  const { session } = useSession();
  const p = usePalette();
  const role = session.user.role;
  const isFarmer = role === "farmer";
  const isManufacturer = role === "manufacturer";
  const isRegulator = role === "regulator";
  const isPharmacist = role === "pharmacist";
  const canUseConsumerScan = role === "consumer" || isPharmacist;

  const [scanCode, setScanCode] = useState("FT-QR-1001");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scanLoading, setScanLoading] = useState(false);
  const [drugScanCode, setDrugScanCode] = useState("DR-QR-1001");
  const [drugScanResult, setDrugScanResult] = useState<DrugScanResult | null>(null);
  const [drugScanStatus, setDrugScanStatus] = useState("Drug scan ready");

  async function scanProduct(code = scanCode) {
    const normalized = code.trim();
    if (!normalized) { setScanStatus("Enter a batch code first."); return; }
    setScanLoading(true);
    setScanStatus("Looking up product...");
    try {
      const response = await fetch(`${apiBase}/scan/${encodeURIComponent(normalized)}`, {
        headers: session.token ? { Authorization: `Bearer ${session.token}` } : undefined,
      });
      const data = (await readJsonResponse(response)) as { result: ProductScanResult };
      setScanResult(data.result);
      setScanStatus(`Scan complete: ${data.result.status}`);
    } catch (error) {
      setScanStatus(getFriendlyErrorMessage(error, "Scan failed"));
    } finally {
      setScanLoading(false);
    }
  }

  async function scanDrug(code = drugScanCode) {
    const normalized = code.trim();
    if (!normalized) { setDrugScanStatus("Enter a drug QR code first."); return; }
    setDrugScanStatus("Looking up drug...");
    try {
      const response = await fetch(`${apiBase}/drug/scan/${encodeURIComponent(normalized)}`);
      const data = (await readJsonResponse(response)) as { result: DrugScanResult; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not scan drug");
      setDrugScanResult(data.result);
      setDrugScanStatus(`Scan complete: ${data.result.status}`);
    } catch (error) {
      setDrugScanStatus(error instanceof Error ? error.message : "Drug scan failed");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 900 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: p.textSecondary }}>Dashboard</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, color: p.textPrimary }}>
          Welcome back, {session.user.fullName?.split(" ")[0] || "there"}
        </h1>
      </div>

      {canUseConsumerScan ? (
        <ConsumerScanSection
          session={session}
          scanCode={scanCode}
          setScanCode={setScanCode}
          scanResult={scanResult}
          scanLoading={scanLoading}
          scanStatus={scanStatus}
          onScan={() => void scanProduct()}
        />
      ) : null}

      {isFarmer ? <FarmerSection session={session} /> : null}
      {isManufacturer ? <ManufacturerSection session={session} /> : null}
      {isRegulator ? <RegulatorSection session={session} /> : null}

      {enableDrugModule && (canUseConsumerScan || isPharmacist) ? (
        <DrugSection
          session={session}
          isPharmacist={isPharmacist}
          drugScanCode={drugScanCode}
          setDrugScanCode={setDrugScanCode}
          drugScanResult={drugScanResult}
          drugScanStatus={drugScanStatus}
          onScanDrug={() => void scanDrug()}
        />
      ) : null}
    </div>
  );
}
