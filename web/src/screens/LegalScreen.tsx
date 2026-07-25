import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalScreen({ title, updated, children }: Props) {
  const { theme } = useTheme();
  const pageBg = theme === "dark" ? "#05070a" : "#f4f6f4";
  const cardBg = theme === "dark" ? "#0d1216" : "#ffffff";
  const border = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(16,36,28,0.1)";
  const textPrimary = theme === "dark" ? "#f4f4ef" : "#10241c";
  const textSecondary = theme === "dark" ? "#93b9ac" : "#5c6f66";

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: "32px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link to="/" style={{ color: "#77c7a2", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>{"< Back"}</Link>
        <h1 style={{ fontSize: 28, color: textPrimary, margin: "16px 0 4px" }}>{title}</h1>
        <p style={{ fontSize: 12.5, color: textSecondary, margin: "0 0 24px" }}>Last updated: {updated}</p>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 20, padding: "28px 32px", color: textSecondary, fontSize: 14.5, lineHeight: 1.7 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalHeading({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <h2 style={{ fontSize: 16, color: theme === "dark" ? "#f4f4ef" : "#10241c", margin: "22px 0 8px" }}>{children}</h2>;
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 4px" }}>{children}</p>;
}
