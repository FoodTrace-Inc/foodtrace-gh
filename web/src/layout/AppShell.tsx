import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import type { AuthResponse } from "@foodtrace/shared";
import { SessionProvider } from "../session/SessionContext";
import { usePalette, useTheme } from "../theme/ThemeContext";
import { LogoMark } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";

interface Props {
  session: AuthResponse;
  onSignOut: () => void;
}

const NAV_ITEMS: { to: string; label: string; icon: string }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "⌘" },
  { to: "/marketplace", label: "Marketplace", icon: "▦" },
  { to: "/assistant", label: "Assistant", icon: "⚙" },
  { to: "/pricing", label: "Pricing", icon: "$" },
  { to: "/profile", label: "Profile", icon: "○" },
];

export function AppShell({ session, onSignOut }: Props) {
  const navigate = useNavigate();
  const p = usePalette();
  const avatarLabel = useMemo(() => {
    const raw = (session.user.fullName || session.user.email || session.user.phone || "").trim();
    if (!raw) return "FT";
    const parts = raw.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2);
    return parts.map((x) => x[0]?.toUpperCase()).join("") || "FT";
  }, [session.user.email, session.user.fullName, session.user.phone]);

  function handleSignOut() {
    onSignOut();
    navigate("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: p.pageBg }} className="app-shell">
      <aside
        style={{
          width: 220,
          flex: "0 0 auto",
          background: p.cardBg,
          borderRight: `1px solid ${p.border}`,
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
        className="app-sidebar"
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 20px" }} className="app-brand-row">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={26} />
            <span style={{ color: p.textPrimary, fontWeight: 700, fontSize: 14 }}>FoodTrace GH</span>
          </div>
          <ThemeToggle size={40} />
        </div>

        <nav className="app-nav" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13.5,
                textDecoration: "none",
                color: isActive ? p.onAccent : p.textSecondary,
                background: isActive ? p.accent : "transparent",
                fontWeight: isActive ? 600 : 400,
              })}
            >
              <span aria-hidden style={{ width: 16, textAlign: "center" }}>{item.icon}</span>
              <span className="app-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-account" style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${p.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: p.accent, color: p.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
              {avatarLabel}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: p.textPrimary, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.user.fullName || session.user.email || session.user.phone}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: p.textSecondary, textTransform: "capitalize" }}>{session.user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            style={{ width: "100%", marginTop: 8, padding: "8px 12px", borderRadius: 10, border: `1px solid ${p.border}`, background: "transparent", color: p.textSecondary, fontSize: 12.5, cursor: "pointer" }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "28px 32px", color: p.textPrimary }} className="app-main">
        <SessionProvider value={{ session, signOut: handleSignOut }}>
          <Outlet />
        </SessionProvider>
      </main>
    </div>
  );
}
