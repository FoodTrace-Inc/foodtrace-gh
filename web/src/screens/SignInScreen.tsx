import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { USER_ROLES, type AuthResponse, type UserRole } from "@foodtrace/shared";
import { enableDrugModule, showDemoMode } from "../lib/api";
import { demoPassword } from "../lib/constants";
import { AuthCard } from "../components/AuthCard";
import { DemoPanel } from "../components/DemoPanel";
import { Logo } from "../components/Logo";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { usePalette, useTheme } from "../theme/ThemeContext";
import { SUBTAG, heroGradient } from "../lib/brand";

interface Props {
  onSignIn: (session: AuthResponse) => void;
}

const BENEFITS = [
  "Scan any product for an instant safety verdict",
  "Get recall & expiry alerts on what you scan",
  "One account — your dashboard fits your role",
];

export function SignInScreen({ onSignIn }: Props) {
  const p = usePalette();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [registerRole, setRegisterRole] = useState<UserRole>("consumer");
  const [prefill, setPrefill] = useState<{ identifier: string; password: string } | null>(null);
  const roleList = enableDrugModule ? USER_ROLES : USER_ROLES.filter((r) => r !== "pharmacist");

  function handleSignIn(session: AuthResponse) {
    onSignIn(session);
    navigate("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: p.pageBg, color: p.textPrimary, display: "flex", flexDirection: "column" }}>
      {/* Slim top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${p.border}` }}>
        <Link to="/" style={{ textDecoration: "none", color: p.textPrimary }}>
          <Logo size={30} color={p.textPrimary} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: p.textSecondary, fontSize: 14, fontWeight: 600 }}>
            <Icon name="arrow" size={16} style={{ transform: "scaleX(-1)" }} /> Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div
        className="mkt-signin"
        style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1180, width: "100%", margin: "0 auto", padding: 24, gap: 32, alignItems: "start" }}
      >
        {/* Brand panel */}
        <div
          className="mkt-signin-brand"
          style={{ borderRadius: 28, padding: "44px 40px", background: heroGradient(theme), border: `1px solid ${p.border}`, minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          <span style={{ fontSize: 12.5, letterSpacing: 2.5, textTransform: "uppercase", color: p.accent, fontWeight: 700 }}>Welcome to FoodTrace GH</span>
          <h1 style={{ margin: "16px 0 0", fontSize: 40, lineHeight: 1.08, letterSpacing: -1, color: p.textPrimary, maxWidth: 420 }}>
            Scan it. Trace it. Trust it.
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.6, color: p.textSecondary, maxWidth: 420 }}>{SUBTAG}</p>
          <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
            {BENEFITS.map((b) => (
              <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 15, color: p.textPrimary }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: p.accent, color: p.onAccent, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="check" size={16} />
                </span>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Auth */}
        <div style={{ display: "grid", gap: 20, justifyItems: "stretch" }}>
          <AuthCard
            session={null}
            role={registerRole}
            setRole={setRegisterRole}
            roleList={roleList}
            onSignIn={handleSignIn}
            onSignOut={() => {}}
            prefillIdentifier={prefill?.identifier}
            prefillPassword={prefill?.password}
          />
        </div>
      </div>

      {showDemoMode ? (
        <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "0 24px 40px" }}>
          <DemoPanel
            onScanFood={() => {}}
            onScanDrug={() => {}}
            onUseDemoAccount={(account) => setPrefill({ identifier: account.email, password: demoPassword })}
          />
        </div>
      ) : null}
    </div>
  );
}
