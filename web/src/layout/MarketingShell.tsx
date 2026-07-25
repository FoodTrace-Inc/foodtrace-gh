import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePalette, useTheme } from "../theme/ThemeContext";
import { Logo } from "../components/Logo";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_NAME, SUBTAG } from "../lib/brand";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
];

export function MarketingShell() {
  const p = usePalette();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const headerBg = theme === "dark" ? "rgba(5,8,11,0.72)" : "rgba(255,255,255,0.72)";

  const linkStyle = (isActive: boolean) => ({
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 4px",
    color: isActive ? p.textPrimary : p.textSecondary,
    borderBottom: `2px solid ${isActive ? p.accent : "transparent"}`,
  });

  return (
    <div style={{ minHeight: "100vh", background: p.pageBg, color: p.textPrimary, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: headerBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${p.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <Link to="/" style={{ textDecoration: "none", color: p.textPrimary }} onClick={() => setOpen(false)}>
            <Logo size={30} color={p.textPrimary} />
          </Link>

          <nav className="mkt-nav-links" style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} style={({ isActive }) => linkStyle(isActive)}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="mkt-nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <Link
              to="/signin"
              style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: p.textSecondary, padding: "8px 6px" }}
            >
              Sign in
            </Link>
            <Link
              to="/signin"
              style={{
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                color: p.onAccent,
                background: p.accent,
                padding: "10px 18px",
                borderRadius: 999,
              }}
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            className="mkt-nav-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{ display: "none", background: "transparent", border: "none", color: p.textPrimary, cursor: "pointer", padding: 6 }}
          >
            <Icon name={open ? "close" : "menu"} size={26} />
          </button>
        </div>

        {open ? (
          <div className="mkt-nav-mobile" style={{ borderTop: `1px solid ${p.border}`, padding: "12px 24px 18px", display: "grid", gap: 6 }}>
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                style={({ isActive }) => ({
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "10px 8px",
                  borderRadius: 10,
                  color: isActive ? p.onAccent : p.textPrimary,
                  background: isActive ? p.accent : "transparent",
                })}
              >
                {l.label}
              </NavLink>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate("/signin"); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${p.border}`, background: "transparent", color: p.textPrimary, fontWeight: 600, cursor: "pointer" }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate("/signin"); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: p.accent, color: p.onAccent, fontWeight: 700, cursor: "pointer" }}
              >
                Get started
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <MarketingFooter />
    </div>
  );
}

function MarketingFooter() {
  const p = usePalette();
  const col: { heading: string; links: { label: string; to: string }[] }[] = [
    {
      heading: "Product",
      links: [
        { label: "Features", to: "/features" },
        { label: "Pricing", to: "/pricing" },
        { label: "Sign in", to: "/signin" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Get started", to: "/signin" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: `1px solid ${p.border}`, background: p.cardBg }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "44px 24px 30px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: 28,
        }}
        className="mkt-footer-grid"
      >
        <div>
          <Logo size={30} color={p.textPrimary} />
          <p style={{ margin: "14px 0 0", color: p.textSecondary, fontSize: 13.5, lineHeight: 1.6, maxWidth: 300 }}>
            {SUBTAG} {APP_NAME} keeps Ghana's food and medicine traceable — from the farm and factory to the shelf in your hand.
          </p>
        </div>
        {col.map((c) => (
          <div key={c.heading}>
            <p style={{ margin: "0 0 12px", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: p.textSecondary, fontWeight: 700 }}>
              {c.heading}
            </p>
            <div style={{ display: "grid", gap: 9 }}>
              {c.links.map((l) => (
                <Link key={l.label} to={l.to} style={{ textDecoration: "none", color: p.textSecondary, fontSize: 14 }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${p.border}` }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: p.textSecondary,
            fontSize: 12.5,
          }}
        >
          <span>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
          <span>Made in Ghana 🇬🇭</span>
        </div>
      </div>
    </footer>
  );
}
