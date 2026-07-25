import { Link } from "react-router-dom";
import { usePalette, useTheme } from "../theme/ThemeContext";
import { Icon } from "../components/Icon";
import { Section, SectionHeading, CtaBanner } from "../components/marketing";
import { SELLER_PLANS, CONSUMER_PLANS, type PlanDef } from "../lib/plans";
import { heroGradient } from "../lib/brand";

function PlanCard({ plan, highlight }: { plan: PlanDef; highlight?: boolean }) {
  const p = usePalette();
  return (
    <div
      style={{
        position: "relative",
        background: p.cardBg,
        border: highlight ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
        borderRadius: 22,
        padding: 26,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {plan.popular ? (
        <span style={{ position: "absolute", top: -12, right: 20, background: p.accent, color: p.onAccent, fontSize: 10.5, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>
          Most popular
        </span>
      ) : null}
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: p.textPrimary }}>{plan.name}</p>
      <p style={{ margin: "10px 0 16px", fontSize: 30, fontWeight: 800, color: p.textPrimary, letterSpacing: -0.5 }}>
        GHS {plan.priceGhs}
        <span style={{ fontSize: 14, fontWeight: 500, color: p.textSecondary }}> /{plan.period}</span>
      </p>
      <div style={{ display: "grid", gap: 9, flex: 1 }}>
        {plan.features.map((f) => (
          <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, color: p.textSecondary }}>
            <Icon name="check" size={16} color={p.accent} /> {f}
          </span>
        ))}
      </div>
      <Link
        to="/signin"
        style={{
          marginTop: 20,
          textAlign: "center",
          textDecoration: "none",
          padding: "12px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          background: highlight ? p.accent : "transparent",
          color: highlight ? p.onAccent : p.textPrimary,
          border: highlight ? "none" : `1px solid ${p.border}`,
        }}
      >
        Get started
      </Link>
    </div>
  );
}

export function PublicPricingScreen() {
  const p = usePalette();
  const { theme } = useTheme();

  return (
    <>
      <section style={{ background: heroGradient(theme) }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "84px 24px 70px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12.5, letterSpacing: 2.5, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>Pricing</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 46, lineHeight: 1.1, letterSpacing: -1, color: p.textPrimary }}>
            Simple plans in Ghana cedis
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 560, fontSize: 18, lineHeight: 1.6, color: p.textSecondary }}>
            Scanning and verifying products is always free. Sellers and power users can unlock more with a subscription — pay by Mobile Money or card, cancel anytime.
          </p>
        </div>
      </section>

      {/* Free tier callout */}
      <Section narrow style={{ paddingBottom: 0 }}>
        <div style={{ background: p.cardBg, border: `1px solid ${p.border}`, borderRadius: 22, padding: "28px 26px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="scan" size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: p.textPrimary }}>Free forever</p>
            <p style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.55, color: p.textSecondary }}>
              Scan any QR, get instant safety verdicts, receive recall alerts and report unsafe products — no payment needed.
            </p>
          </div>
          <Link to="/signin" style={{ textDecoration: "none", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 999, background: p.accent, color: p.onAccent, whiteSpace: "nowrap" }}>
            Create account
          </Link>
        </div>
      </Section>

      {/* Consumer premium */}
      <Section narrow>
        <SectionHeading kicker="For consumers" title="Go premium" lead="For shoppers who want unlimited history, watchlists and priority support." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px)", justifyContent: "center", marginTop: 36 }}>
          {CONSUMER_PLANS.map((plan) => (
            <PlanCard key={plan.key} plan={plan} highlight />
          ))}
        </div>
      </Section>

      {/* Seller plans */}
      <div style={{ background: p.cardBg, borderTop: `1px solid ${p.border}`, borderBottom: `1px solid ${p.border}` }}>
        <Section>
          <SectionHeading kicker="For farmers, manufacturers & pharmacists" title="Seller plans" lead="Register products, generate QR codes and issue recalls. Scale your plan as your catalogue grows." />
          <div className="mkt-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginTop: 40 }}>
            {SELLER_PLANS.map((plan) => (
              <PlanCard key={plan.key} plan={plan} highlight={plan.popular} />
            ))}
          </div>
          <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: 13.5, color: p.textSecondary }}>
            Prices in Ghana cedis (GHS). Pay with MTN / Telecel / AirtelTigo Mobile Money or card. Cancel anytime.
          </p>
        </Section>
      </div>

      <CtaBanner title="Start free, upgrade when you're ready" subtitle="Create your account today — no card required to scan, verify and stay safe." primaryLabel="Get started free" />
    </>
  );
}
