import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePalette } from "../theme/ThemeContext";
import { Icon } from "./Icon";

/** Centered, max-width page section with consistent vertical rhythm. */
export function Section({
  children,
  style,
  narrow,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <section className={className} style={{ padding: "72px 24px", ...style }}>
      <div style={{ maxWidth: narrow ? 820 : 1180, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

/** Small uppercase label above a heading. */
export function Kicker({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <p style={{ margin: 0, fontSize: 12.5, letterSpacing: 2.5, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>
      {children}
    </p>
  );
}

/** Section heading + optional lead paragraph, centered by default. */
export function SectionHeading({
  kicker,
  title,
  lead,
  align = "center",
}: {
  kicker?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
}) {
  const p = usePalette();
  return (
    <div style={{ textAlign: align, maxWidth: align === "center" ? 640 : undefined, margin: align === "center" ? "0 auto" : undefined }}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h2 style={{ margin: kicker ? "12px 0 0" : 0, fontSize: 34, lineHeight: 1.15, letterSpacing: -0.5, color: p.textPrimary }}>{title}</h2>
      {lead ? <p style={{ margin: "14px 0 0", fontSize: 16.5, lineHeight: 1.6, color: p.textSecondary }}>{lead}</p> : null}
    </div>
  );
}

/** Rounded surface card. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const p = usePalette();
  return (
    <div style={{ background: p.cardBg, border: `1px solid ${p.border}`, borderRadius: 20, padding: 24, ...style }}>
      {children}
    </div>
  );
}

/** Accent or ghost button rendered as a router Link. */
export function CtaLink({
  to,
  children,
  variant = "primary",
  withArrow,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  withArrow?: boolean;
}) {
  const p = usePalette();
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 15,
    padding: "13px 22px",
    borderRadius: 999,
  };
  const style: CSSProperties =
    variant === "primary"
      ? { ...base, background: p.accent, color: p.onAccent }
      : { ...base, background: "transparent", color: p.textPrimary, border: `1px solid ${p.border}` };
  return (
    <Link to={to} style={style}>
      {children}
      {withArrow ? <Icon name="arrow" size={18} /> : null}
    </Link>
  );
}

/** Full-width closing call-to-action band. */
export function CtaBanner({
  title,
  subtitle,
  primaryTo = "/signin",
  primaryLabel = "Get started free",
}: {
  title: string;
  subtitle: string;
  primaryTo?: string;
  primaryLabel?: string;
}) {
  const p = usePalette();
  return (
    <Section>
      <div
        style={{
          background: `linear-gradient(135deg, ${p.accent} 0%, #0f5d49 100%)`,
          borderRadius: 28,
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 32, color: "#ffffff", letterSpacing: -0.5 }}>{title}</h2>
        <p style={{ margin: "14px auto 0", maxWidth: 520, fontSize: 16.5, lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>{subtitle}</p>
        <div style={{ marginTop: 26, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to={primaryTo}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 800, fontSize: 15, padding: "14px 26px", borderRadius: 999, background: "#ffffff", color: "#0d3428" }}
          >
            {primaryLabel} <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    </Section>
  );
}
