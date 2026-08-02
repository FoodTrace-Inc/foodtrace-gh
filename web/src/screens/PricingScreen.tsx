import { useState } from "react";
import { apiBase, paystackPublicKey, fetchWithTimeout } from "../lib/api";
import { SELLER_PLANS, CONSUMER_PLANS, type PlanDef } from "../lib/plans";
import { usePalette } from "../theme/ThemeContext";
import { useSession } from "../session/SessionContext";

declare global {
  interface Window {
    PaystackPop?: {
      setup(options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }): { openIframe(): void };
    };
  }
}

export function PricingScreen() {
  const { session } = useSession();
  const p = usePalette();
  const isSeller = session.user.role === "manufacturer" || session.user.role === "pharmacist";
  const plans = isSeller ? SELLER_PLANS : CONSUMER_PLANS;

  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function subscribe(plan: PlanDef) {
    if (!window.PaystackPop) {
      setStatus("Payment library did not load. Check your connection and reload the page.");
      return;
    }
    if (!paystackPublicKey) {
      setStatus("Payments are not configured yet - VITE_PAYSTACK_PUBLIC_KEY is not set.");
      return;
    }
    setBusyPlan(plan.key);
    setStatus("Starting payment...");
    try {
      const initRes = await fetchWithTimeout(`${apiBase}/payments/initialize-inline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ planType: plan.key, email: session.user.email }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || initData.message || "Could not start payment.");

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: initData.email,
        amount: initData.amountKobo,
        currency: "GHS",
        ref: initData.reference,
        callback: (response) => {
          void (async () => {
            setStatus("Verifying payment...");
            try {
              const verifyRes = await fetchWithTimeout(`${apiBase}/payments/verify/${response.reference}`, {
                headers: { Authorization: `Bearer ${session.token}` },
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.status === "success") {
                setStatus(`Payment successful. Your ${plan.name} plan is now active.`);
              } else {
                setStatus("Payment failed or cancelled. Please try again.");
              }
            } catch {
              setStatus("Could not verify payment. Check your subscription status on the Profile page.");
            } finally {
              setBusyPlan(null);
            }
          })();
        },
        onClose: () => {
          setStatus("Payment window closed.");
          setBusyPlan(null);
        },
      });
      handler.openIframe();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start payment.");
      setBusyPlan(null);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: p.textSecondary }}>Pricing</p>
      <h1 style={{ margin: "4px 0 6px", fontSize: 26, color: p.textPrimary }}>
        {isSeller ? "Choose a subscription plan" : "Upgrade to premium"}
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: p.textSecondary }}>
        Prices in Ghana cedis (GHS). Pay by MTN/Vodafone/AirtelTigo Mobile Money or card. Cancel anytime.
      </p>

      {status ? (
        <div style={{ background: p.cardBg, border: `1px solid ${p.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 20, color: p.textPrimary, fontSize: 13 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, gap: 16 }} className="app-grid-2">
        {plans.map((plan) => (
          <div
            key={plan.key}
            style={{
              background: p.cardBg,
              border: plan.popular ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
              borderRadius: 20,
              padding: 22,
              position: "relative",
            }}
          >
            {plan.popular ? (
              <span style={{ position: "absolute", top: -12, right: 18, background: p.accent, color: p.onAccent, fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                Most popular
              </span>
            ) : null}
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: p.textPrimary }}>{plan.name}</p>
            <p style={{ margin: "0 0 14px", fontSize: 26, fontWeight: 800, color: p.textPrimary }}>
              GHS {plan.priceGhs} <span style={{ fontSize: 13, fontWeight: 500, color: p.textSecondary }}>/{plan.period}</span>
            </p>
            {plan.features.map((f) => (
              <p key={f} style={{ margin: "0 0 6px", fontSize: 13, color: p.textSecondary }}>- {f}</p>
            ))}
            <button
              type="button"
              onClick={() => void subscribe(plan)}
              disabled={busyPlan === plan.key}
              style={{
                width: "100%", marginTop: 14, padding: "12px", borderRadius: 12, border: "none",
                background: p.accent, color: p.onAccent, fontWeight: 700, fontSize: 14,
                cursor: "pointer", opacity: busyPlan === plan.key ? 0.6 : 1,
              }}
            >
              {busyPlan === plan.key ? "Processing..." : "Subscribe now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
