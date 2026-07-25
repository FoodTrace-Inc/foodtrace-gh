import { usePalette, useTheme } from "../theme/ThemeContext";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { Section, SectionHeading, Card, CtaLink, CtaBanner } from "../components/marketing";
import { FEATURES, STEPS, heroGradient } from "../lib/brand";

interface Detail {
  icon: IconName;
  kicker: string;
  title: string;
  desc: string;
  points: string[];
}

const DETAILS: Detail[] = [
  {
    icon: "scan",
    kicker: "For everyone",
    title: "Verify any product in one scan",
    desc: "Scan the QR on a food item or medicine and get an unmistakable verdict — Safe, Caution, Recalled or Not found — with the reasons behind it. No account required to check.",
    points: ["Clear colour-coded safety status", "Batch, expiry and recall checks in real time", "Full scan history saved to your account", "Report an unsafe product in a tap"],
  },
  {
    icon: "route",
    kicker: "For sellers",
    title: "Traceability that sells itself",
    desc: "Farmers log inputs and safe-harvest dates; manufacturers register batches with ingredients, processing and quality checks. Every batch becomes a QR buyers can trust.",
    points: ["Generate QR codes per batch", "Full farm-to-shelf ingredient trail", "Pesticide use & withdrawal tracking", "Weather-aware harvest planning"],
  },
  {
    icon: "bell",
    kicker: "For safety",
    title: "Recalls that actually reach people",
    desc: "When a manufacturer or regulator pulls a product, everyone who scanned it is notified instantly — and the shelf verdict flips to Recalled the moment it happens.",
    points: ["One-tap recalls for sellers & FDA", "Push alerts to affected scanners", "District-level recall scoping", "Expiry warnings before it's too late"],
  },
  {
    icon: "spark",
    kicker: "For confidence",
    title: "An AI assistant that speaks your language",
    desc: "Ask about a pesticide, a drug interaction or a recall in plain English or Twi and get a grounded, sourced answer — right when you're standing in the shop.",
    points: ["English & Twi support", "Grounded in FDA & platform data", "Voice-friendly summaries", "Available to every role"],
  },
];

export function FeaturesScreen() {
  const p = usePalette();
  const { theme } = useTheme();

  return (
    <>
      {/* Hero */}
      <section style={{ background: heroGradient(theme) }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "84px 24px 76px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12.5, letterSpacing: 2.5, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>Features</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 46, lineHeight: 1.1, letterSpacing: -1, color: p.textPrimary }}>
            The whole toolkit for a traceable supply chain
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 600, fontSize: 18, lineHeight: 1.65, color: p.textSecondary }}>
            Scanning, traceability, recalls, a marketplace and an AI assistant — everything works together, on any phone or in the browser.
          </p>
          <div style={{ marginTop: 28 }}>
            <CtaLink to="/signin" withArrow>Get started free</CtaLink>
          </div>
        </div>
      </section>

      {/* Feature overview grid */}
      <Section>
        <SectionHeading kicker="At a glance" title="Six capabilities, one platform" />
        <div className="mkt-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 44 }}>
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: theme === "dark" ? "rgba(119,199,162,0.14)" : "rgba(28,156,110,0.1)", display: "grid", placeItems: "center", color: p.accent }}>
                <Icon name={f.icon} size={24} />
              </div>
              <h3 style={{ margin: "16px 0 8px", fontSize: 18, color: p.textPrimary }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: p.textSecondary }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Alternating detail sections */}
      <div style={{ background: p.cardBg, borderTop: `1px solid ${p.border}` }}>
        {DETAILS.map((d, i) => (
          <div key={d.title} style={{ borderBottom: `1px solid ${p.border}` }}>
            <div
              className="mkt-detail-row"
              style={{
                maxWidth: 1080,
                margin: "0 auto",
                padding: "64px 24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 48,
                alignItems: "center",
              }}
            >
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <p style={{ margin: 0, fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>{d.kicker}</p>
                <h2 style={{ margin: "12px 0 0", fontSize: 30, lineHeight: 1.15, letterSpacing: -0.5, color: p.textPrimary }}>{d.title}</h2>
                <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.65, color: p.textSecondary }}>{d.desc}</p>
                <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
                  {d.points.map((pt) => (
                    <span key={pt} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14.5, color: p.textPrimary }}>
                      <Icon name="check" size={17} color={p.accent} /> {pt}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ order: i % 2 === 0 ? 1 : 0, display: "grid", placeItems: "center" }}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: 24,
                    background: heroGradient(theme),
                    border: `1px solid ${p.border}`,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div style={{ width: 92, height: 92, borderRadius: 26, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center", boxShadow: `0 24px 60px -20px ${p.accent}` }}>
                    <Icon name={d.icon} size={44} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works recap */}
      <Section>
        <SectionHeading kicker="The flow" title="Shelf to source in four steps" />
        <div className="mkt-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 44 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ background: p.cardBg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 22 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: p.accent, letterSpacing: -1 }}>{s.n}</span>
              <h3 style={{ margin: "10px 0 8px", fontSize: 17, color: p.textPrimary }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: p.textSecondary }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBanner title="See it on your own products" subtitle="Sign in with a free account, try the demo data, and watch a product trace itself from shelf to source." primaryLabel="Get started free" />
    </>
  );
}
