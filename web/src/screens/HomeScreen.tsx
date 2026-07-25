import { Link } from "react-router-dom";
import { usePalette, useTheme } from "../theme/ThemeContext";
import { Icon } from "../components/Icon";
import { BrandRing } from "../components/BrandRing";
import { Section, SectionHeading, Card, CtaLink, CtaBanner } from "../components/marketing";
import { FEATURES, ROLES, STEPS, TAGLINE, HERO_BLURB, TRUST_CHIPS, heroGradient } from "../lib/brand";

export function HomeScreen() {
  const p = usePalette();
  const { theme } = useTheme();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ background: heroGradient(theme) }}>
        <div
          className="mkt-hero"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "84px 24px 92px",
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div className="ft-fade-up">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                background: theme === "dark" ? "rgba(119,199,162,0.14)" : "rgba(28,156,110,0.12)",
                border: `1px solid ${p.border}`,
                color: p.accent,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Icon name="shield" size={15} /> Ghana's food & drug traceability platform
            </span>
            <h1 style={{ margin: "22px 0 0", fontSize: 56, lineHeight: 1.04, letterSpacing: -1.5, color: p.textPrimary, maxWidth: 560 }}>
              {TAGLINE}
            </h1>
            <p style={{ margin: "22px 0 0", fontSize: 18, lineHeight: 1.6, color: p.textSecondary, maxWidth: 520 }}>
              {HERO_BLURB}
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
              <CtaLink to="/signin" withArrow>Get started free</CtaLink>
              <CtaLink to="/features" variant="ghost">See how it works</CtaLink>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>
              {TRUST_CHIPS.map((c) => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: p.textSecondary, fontSize: 13.5, fontWeight: 600 }}>
                  <Icon name="check" size={15} color={p.accent} /> {c}
                </span>
              ))}
            </div>
          </div>

          <div className="mkt-hero-visual" style={{ position: "relative", display: "grid", placeItems: "center" }}>
            <BrandRing p={p} size={260} />
            <div
              className="ft-float"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                background: p.cardBg,
                border: `1px solid ${p.border}`,
                borderRadius: 18,
                padding: "16px 18px",
                boxShadow: "0 24px 60px -24px rgba(0,0,0,0.5)",
                minWidth: 220,
              }}
            >
              <span style={{ display: "inline-flex", padding: "5px 11px", borderRadius: 999, background: "#c4f1db", color: "#12392d", fontSize: 11.5, fontWeight: 800 }}>SAFE</span>
              <p style={{ margin: "12px 0 2px", color: p.textPrimary, fontWeight: 700, fontSize: 15 }}>Accra Foods Tomato Paste</p>
              <p style={{ margin: 0, color: p.textSecondary, fontSize: 12.5 }}>FT-QR-1001 · Batch verified · No recalls</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust band ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${p.border}`, borderBottom: `1px solid ${p.border}`, background: p.cardBg }}>
        <div
          className="mkt-stat-band"
          style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
        >
          {[
            { big: "5 roles", small: "One connected platform" },
            { big: "Seconds", small: "To verify any product" },
            { big: "2 languages", small: "English & Twi" },
            { big: "0 cost", small: "To scan & check safety" },
          ].map((s) => (
            <div key={s.small} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: p.textPrimary, letterSpacing: -0.5 }}>{s.big}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: p.textSecondary }}>{s.small}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────── */}
      <Section>
        <SectionHeading
          kicker="What you get"
          title="Everything needed to trust what's on the shelf"
          lead="From a single scan to a nationwide recall, FoodTrace GH covers the full journey of every product."
        />
        <div
          className="mkt-grid-3"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 44 }}
        >
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

      {/* ── Who it's for ─────────────────────────────────────── */}
      <div style={{ background: p.cardBg, borderTop: `1px solid ${p.border}`, borderBottom: `1px solid ${p.border}` }}>
        <Section>
          <SectionHeading kicker="Built for everyone in the chain" title="One account. The dashboard that fits your role." lead="Your experience is set by who you are — a consumer checking a snack, or a regulator watching the whole country." />
          <div className="mkt-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 44 }}>
            {ROLES.map((r) => (
              <div key={r.key} style={{ background: p.pageBg, border: `1px solid ${p.border}`, borderRadius: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center" }}>
                    <Icon name={r.icon} size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: p.textPrimary }}>{r.label}</h3>
                </div>
                <p style={{ margin: "14px 0 14px", fontSize: 14.5, lineHeight: 1.55, color: p.textSecondary }}>{r.blurb}</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {r.points.map((pt) => (
                    <span key={pt} style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, color: p.textPrimary }}>
                      <Icon name="check" size={15} color={p.accent} /> {pt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <Section>
        <SectionHeading kicker="How it works" title="Four steps from shelf to source" />
        <div className="mkt-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 44 }}>
          {STEPS.map((s) => (
            <div key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: p.accent, letterSpacing: -1 }}>{s.n}</span>
                <span style={{ flex: 1, height: 1, background: p.border }} />
              </div>
              <h3 style={{ margin: "16px 0 8px", fontSize: 18, color: p.textPrimary }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: p.textSecondary }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <CtaLink to="/signin" withArrow>Try it now</CtaLink>
        </div>
      </Section>

      {/* ── Closing CTA ──────────────────────────────────────── */}
      <CtaBanner
        title="Ready to trace your food?"
        subtitle="Create a free account and start scanning, verifying and trusting in minutes. No card needed to get started."
      />

      <div style={{ textAlign: "center", paddingBottom: 40 }}>
        <Link to="/about" style={{ color: p.textSecondary, fontSize: 14, textDecoration: "none" }}>
          Learn more about our mission →
        </Link>
      </div>
    </>
  );
}
