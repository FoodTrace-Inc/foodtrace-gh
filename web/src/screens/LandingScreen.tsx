import { useState } from "react";
import { Link } from "react-router-dom";
import { USER_ROLES, type AuthResponse, type UserRole } from "@foodtrace/shared";
import { enableDrugModule, showDemoMode } from "../lib/api";
import { demoPassword } from "../lib/constants";
import { AuthCard } from "../components/AuthCard";
import { DemoPanel } from "../components/DemoPanel";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  onSignIn: (session: AuthResponse) => void;
}

export function LandingScreen({ onSignIn }: Props) {
  const { theme } = useTheme();
  const [registerRole, setRegisterRole] = useState<UserRole>("consumer");
  const [prefill, setPrefill] = useState<{ identifier: string; password: string } | null>(null);
  const roleList = enableDrugModule ? USER_ROLES : USER_ROLES.filter((r) => r !== "pharmacist");

  const heroBg =
    theme === "dark"
      ? "radial-gradient(circle at top, #0f5d49 0%, #08131b 45%, #05070a 100%)"
      : "radial-gradient(circle at top, #ffe9c2 0%, #fff3e0 45%, #f4f6f4 100%)";
  const pageBg = theme === "dark" ? "#05070a" : "#f4f6f4";
  const heroCardBg = theme === "dark" ? "rgba(7, 17, 22, 0.7)" : "rgba(255,255,255,0.6)";
  const heroBorder = theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(16,36,28,0.08)";
  const heroText = theme === "dark" ? "#f4f4ef" : "#10241c";

  return (
    <main style={{ minHeight: "100vh", background: pageBg, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, padding: 32, flex: 1 }} className="app-page">
        <section style={{ padding: 28, borderRadius: 28, background: heroBg }}>
          <div style={{ padding: 24, borderRadius: 20, background: heroCardBg, border: heroBorder, display: "inline-block" }}>
            <p style={{ margin: 0, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7, color: heroText, fontSize: 13 }}>FoodTrace GH</p>
            <h1 style={{ fontSize: 48, lineHeight: 1.05, maxWidth: 520, margin: "16px 0", color: heroText }}>Scan It. Trace It. Trust It.</h1>
            <p style={{ maxWidth: 520, fontSize: 16, lineHeight: 1.6, opacity: 0.85, color: heroText }}>
              FoodTrace GH connects consumers, farmers, manufacturers, and FDA regulators in one traceability platform for safer local food.
              Log in or create an account — your dashboard is set by your account, not a toggle.
            </p>
          </div>
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <AuthCard
            session={null}
            role={registerRole}
            setRole={setRegisterRole}
            roleList={roleList}
            onSignIn={onSignIn}
            onSignOut={() => {}}
            prefillIdentifier={prefill?.identifier}
            prefillPassword={prefill?.password}
          />
          {showDemoMode ? (
            <DemoPanel
              onScanFood={() => {}}
              onScanDrug={() => {}}
              onUseDemoAccount={(account) => setPrefill({ identifier: account.email, password: demoPassword })}
            />
          ) : null}
        </div>
      </div>

      <footer style={{ display: "flex", justifyContent: "center", gap: 20, padding: "18px 32px", fontSize: 12.5 }}>
        <Link to="/about" style={{ color: heroText, opacity: 0.65, textDecoration: "none" }}>About</Link>
        <Link to="/terms" style={{ color: heroText, opacity: 0.65, textDecoration: "none" }}>Terms and conditions</Link>
        <Link to="/privacy" style={{ color: heroText, opacity: 0.65, textDecoration: "none" }}>Privacy policy</Link>
      </footer>
    </main>
  );
}
