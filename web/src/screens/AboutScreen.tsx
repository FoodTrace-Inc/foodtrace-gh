import { usePalette, useTheme } from "../theme/ThemeContext";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { Section, SectionHeading, Card, CtaBanner } from "../components/marketing";
import { ROLES, heroGradient } from "../lib/brand";

const VALUES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "shield", title: "Safety first", desc: "Every feature exists to keep unsafe food and counterfeit medicine away from Ghanaian families." },
  { icon: "route", title: "Radical transparency", desc: "A product should be able to tell its whole story — where it came from and everything that happened to it." },
  { icon: "user", title: "Built for everyone", desc: "From a market trader with a basic phone to an FDA officer, the tools meet people where they are." },
  { icon: "globe", title: "Local by design", desc: "Ghana-first: cedis, Mobile Money, English and Twi, and the realities of local supply chains." },
];

const PROBLEMS = [
  "Shoppers can't tell a safe product from an expired or recalled one on the shelf.",
  "Counterfeit and banned medicines still reach pharmacy counters.",
  "Farmers and manufacturers have no simple way to prove their goods are safe.",
  "When something goes wrong, recalls are slow and rarely reach the people holding the product.",
];

export function AboutScreen() {
  const p = usePalette();
  const { theme } = useTheme();

  return (
    <>
      {/* Hero */}
      <section style={{ background: heroGradient(theme) }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "84px 24px 76px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 12.5, letterSpacing: 2.5, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>About us</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 46, lineHeight: 1.1, letterSpacing: -1, color: p.textPrimary }}>
            Making every product on Ghana's shelves worthy of trust
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 620, fontSize: 18, lineHeight: 1.65, color: p.textSecondary }}>
            FoodTrace GH is a traceability platform that connects the whole supply chain — so a single scan can tell you
            whether a product is safe, where it came from, and what happened to it along the way.
          </p>
        </div>
      </section>

      {/* Mission */}
      <Section narrow>
        <SectionHeading kicker="Our mission" title="Safe food and genuine medicine, verifiable by anyone" align="left" />
        <p style={{ marginTop: 18, fontSize: 16.5, lineHeight: 1.75, color: p.textSecondary }}>
          Millions of Ghanaians buy food and medicine every day with no reliable way to check whether it's safe. We're
          changing that. By giving every batch a scannable identity — and connecting consumers, farmers, manufacturers,
          pharmacists and FDA regulators on one platform — FoodTrace GH turns trust from a hope into something you can
          verify in seconds.
        </p>
      </Section>

      {/* The problem */}
      <div style={{ background: p.cardBg, borderTop: `1px solid ${p.border}`, borderBottom: `1px solid ${p.border}` }}>
        <Section>
          <SectionHeading kicker="The problem" title="Trust breaks down where the chain is invisible" />
          <div className="mkt-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 40 }}>
            {PROBLEMS.map((text) => (
              <div key={text} style={{ display: "flex", gap: 14, background: p.pageBg, border: `1px solid ${p.border}`, borderRadius: 16, padding: "18px 20px" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: "#f7c2c2", color: "#7a1b1b", display: "grid", placeItems: "center", fontWeight: 800 }}>!</span>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: p.textPrimary }}>{text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Our approach */}
      <Section>
        <SectionHeading kicker="Our approach" title="Give every product a story it can prove" lead="We attach a verifiable identity to each batch and keep it updated at every step — then make it readable by a single QR scan." />
        <div className="mkt-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 44 }}>
          {[
            { icon: "scan" as IconName, title: "Capture", desc: "Farmers log inputs, manufacturers register batches, pharmacists record stock — each generating a QR identity." },
            { icon: "route" as IconName, title: "Connect", desc: "Those records link together into one continuous trail from source to shelf, visible to the right people." },
            { icon: "bell" as IconName, title: "Act", desc: "Consumers verify instantly; regulators and sellers issue recalls that reach everyone who scanned the product." },
          ].map((s) => (
            <Card key={s.title}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center" }}>
                <Icon name={s.icon} size={24} />
              </div>
              <h3 style={{ margin: "16px 0 8px", fontSize: 18, color: p.textPrimary }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: p.textSecondary }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Values */}
      <div style={{ background: p.cardBg, borderTop: `1px solid ${p.border}`, borderBottom: `1px solid ${p.border}` }}>
        <Section>
          <SectionHeading kicker="What we stand for" title="Principles behind the product" />
          <div className="mkt-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 40 }}>
            {VALUES.map((v) => (
              <div key={v.title} style={{ display: "flex", gap: 16, background: p.pageBg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 22 }}>
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: theme === "dark" ? "rgba(119,199,162,0.14)" : "rgba(28,156,110,0.1)", color: p.accent, display: "grid", placeItems: "center" }}>
                  <Icon name={v.icon} size={22} />
                </div>
                <div>
                  <h3 style={{ margin: "2px 0 6px", fontSize: 17, color: p.textPrimary }}>{v.title}</h3>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: p.textSecondary }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Who we serve */}
      <Section>
        <SectionHeading kicker="Who we serve" title="Five roles, one shared source of truth" />
        <div className="mkt-role-strip" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginTop: 40 }}>
          {ROLES.map((r) => (
            <div key={r.key} style={{ textAlign: "center", background: p.cardBg, border: `1px solid ${p.border}`, borderRadius: 16, padding: "22px 12px" }}>
              <div style={{ width: 46, height: 46, margin: "0 auto", borderRadius: 13, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center" }}>
                <Icon name={r.icon} size={23} />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 14.5, fontWeight: 700, color: p.textPrimary }}>{r.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBanner title="Join the platform" subtitle="Whoever you are in the chain, there's a place for you on FoodTrace GH. Create your account and start today." primaryLabel="Create your account" />
    </>
  );
}
