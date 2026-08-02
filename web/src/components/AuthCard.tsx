import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AuthResponse, UserRole } from "@foodtrace/shared";
import { apiBase, readJsonResponse, getApiErrorMessage, getFriendlyErrorMessage, fetchWithTimeout } from "../lib/api";
import { useTheme, usePalette } from "../theme/ThemeContext";
import { PasswordField } from "./PasswordField";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";
import { PasswordStrengthMeter, isPasswordStrongEnough } from "./PasswordStrengthMeter";

type Mode = "login" | "register" | "forgot";
type RegisterStep = "main" | "security";

const SECURITY_QUESTIONS: { id: string; text: string }[] = [
  { id: "Q1", text: "What was the full name of your first primary school teacher?" },
  { id: "Q2", text: "What was the street name of the house you grew up in?" },
  { id: "Q3", text: "What was your maternal grandmother's first name?" },
  { id: "Q4", text: "What was the name of your first Senior High School house?" },
  { id: "Q5", text: "What was the name of the first person you sent mobile money to?" },
  { id: "Q6", text: "What was the name of the hospital you were born in?" },
];

interface Props {
  session: AuthResponse | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleList: UserRole[];
  onSignIn: (session: AuthResponse) => void;
  onSignOut: () => void;
  prefillIdentifier?: string;
  prefillPassword?: string;
}

export function AuthCard({ session, role, setRole, roleList, onSignIn, onSignOut, prefillIdentifier, prefillPassword }: Props) {
  const { theme, toggleTheme } = useTheme();
  const p = usePalette();
  const [mode, setMode] = useState<Mode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("main");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("Ready");
  const [securityQuestion1, setSecurityQuestion1] = useState(SECURITY_QUESTIONS[0].id);
  const [securityAnswer1, setSecurityAnswer1] = useState("");
  const [securityQuestion2, setSecurityQuestion2] = useState(SECURITY_QUESTIONS[1].id);
  const [securityAnswer2, setSecurityAnswer2] = useState("");

  useEffect(() => {
    if (prefillIdentifier) { setMode("login"); setIdentifier(prefillIdentifier); }
    if (prefillPassword) setPassword(prefillPassword);
  }, [prefillIdentifier, prefillPassword]);

  const displayName = session?.user.fullName || session?.user.email || session?.user.phone || "Account";
  const avatarLabel = useMemo(() => {
    const raw = (session?.user.fullName || session?.user.email || session?.user.phone || "").trim();
    if (!raw) return "FT";
    const parts = raw.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2);
    return parts.map((x) => x[0]?.toUpperCase()).join("") || "FT";
  }, [session?.user.email, session?.user.fullName, session?.user.phone]);

  function continueToSecurityStep() {
    if (!fullName.trim()) { setStatus("Please enter your full name."); return; }
    if (!phone.trim() && !email.trim()) { setStatus("Please enter a phone number or email address."); return; }
    if (!isPasswordStrongEnough(password)) {
      setStatus("Password must be at least 8 characters and include an uppercase letter, a number, and a special character (!@#$%^&*).");
      return;
    }
    setStatus("Ready");
    setRegisterStep("security");
  }

  async function submit() {
    if (mode === "register") {
      if (securityQuestion1 === securityQuestion2) { setStatus("Please choose two different questions"); return; }
      if (securityAnswer1.trim().length < 3 || securityAnswer2.trim().length < 3) { setStatus("Each answer must be at least 3 characters"); return; }
    }
    setStatus("Sending request...");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { identifier, password }
          : { fullName, phone: phone || null, email: email || null, password, role, language,
              securityQuestion1, securityAnswer1: securityAnswer1.trim(),
              securityQuestion2, securityAnswer2: securityAnswer2.trim() };

      const response = await fetchWithTimeout(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await readJsonResponse(response)) as AuthResponse & { error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(data.error, "Authentication failed"));

      onSignIn(data);
      setStatus(`Signed in as ${data.user.role}. Opening your portal...`);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Authentication failed"));
    }
  }

  const cardStyle: CSSProperties = {
    background: p.cardBg,
    border: `1px solid ${p.border}`,
    borderRadius: 20,
    padding: "28px 24px",
  };
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, color: p.textSecondary, margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
  const fieldStyle: CSSProperties = { width: "100%", background: p.fieldBg, border: `1px solid ${p.border}`, borderRadius: 12, padding: "12px 14px", color: p.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const primaryBtn: CSSProperties = { width: "100%", background: p.accent, color: p.onAccent, border: "none", borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const ghostBtn: CSSProperties = { width: "100%", background: "transparent", color: p.textSecondary, border: `1px solid ${p.border}`, borderRadius: 12, padding: "11px", fontWeight: 600, fontSize: 13, cursor: "pointer" };

  const themeToggle = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      style={{
        width: 46, height: 26, borderRadius: 999,
        background: theme === "dark" ? "#1c2620" : "#dfe6e1",
        border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%",
          background: theme === "dark" ? p.accent : "#ffffff",
          boxShadow: theme === "light" ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
          left: theme === "dark" ? 22 : 3,
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );

  if (session) {
    return (
      <section style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: p.accent, color: p.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>{avatarLabel}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: p.textPrimary, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
            <p style={{ margin: "2px 0 0", color: p.textSecondary, fontSize: 13, textTransform: "capitalize" }}>{session.user.role}</p>
          </div>
          <button type="button" onClick={onSignOut} style={{ ...ghostBtn, width: "auto", padding: "9px 14px" }}>Log out</button>
        </div>
        <p style={{ marginTop: 14, marginBottom: 0, color: p.textSecondary, fontSize: 13 }}>{status}</p>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: p.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: p.onAccent }}>FT</div>
          <span style={{ color: p.textPrimary, fontWeight: 700, fontSize: 13 }}>FoodTrace GH</span>
        </div>
        {themeToggle}
      </div>

      <p style={{ color: p.textPrimary, fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>
        {mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
      </p>
      <p style={{ color: p.textSecondary, fontSize: 12.5, margin: "0 0 20px" }}>
        {mode === "register" ? "Join FoodTrace GH to trace and verify products." : mode === "forgot" ? "We'll help you get back in." : "Log in to trace what you scan."}
      </p>

      {mode !== "forgot" ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, background: p.fieldBg, borderRadius: 12, padding: 4, border: `1px solid ${p.border}` }}>
          <button type="button" onClick={() => { setMode("login"); setRegisterStep("main"); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12.5, background: mode === "login" ? p.accent : "transparent", color: mode === "login" ? p.onAccent : p.textSecondary }}>
            Log in
          </button>
          <button type="button" onClick={() => { setMode("register"); setRegisterStep("main"); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12.5, background: mode === "register" ? p.accent : "transparent", color: mode === "register" ? p.onAccent : p.textSecondary }}>
            Create account
          </button>
        </div>
      ) : null}

      {mode === "register" && registerStep === "main" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={labelStyle}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <label style={labelStyle}>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <label style={labelStyle}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <div>
            <label style={labelStyle}>Password</label>
            <PasswordField value={password} onChange={setPassword} palette={p} placeholder="At least 8 characters" />
            <PasswordStrengthMeter password={password} />
          </div>
          <label style={labelStyle}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={{ ...fieldStyle, marginTop: 6 }}>
              {roleList.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Language<input value={language} onChange={(e) => setLanguage(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <button
            type="button"
            onClick={continueToSecurityStep}
            disabled={!isPasswordStrongEnough(password)}
            style={!isPasswordStrongEnough(password) ? { ...primaryBtn, opacity: 0.5, cursor: "not-allowed" } : primaryBtn}
          >
            Continue
          </button>
        </div>
      ) : mode === "register" && registerStep === "security" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, color: p.textPrimary, fontWeight: 700, fontSize: 15 }}>Set your security questions</p>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 12.5 }}>These will be used to recover your account if you forget your password.</p>
          <label style={labelStyle}>
            Security question 1
            <select value={securityQuestion1} onChange={(e) => setSecurityQuestion1(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }}>
              {SECURITY_QUESTIONS.map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Your answer (at least 3 characters)<input value={securityAnswer1} onChange={(e) => setSecurityAnswer1(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <label style={labelStyle}>
            Security question 2
            <select value={securityQuestion2} onChange={(e) => setSecurityQuestion2(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }}>
              {SECURITY_QUESTIONS.map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Your answer (at least 3 characters)<input value={securityAnswer2} onChange={(e) => setSecurityAnswer2(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          {securityQuestion1 === securityQuestion2 ? (
            <p style={{ margin: 0, color: "#F09595", fontSize: 12.5 }}>Please choose two different questions</p>
          ) : null}
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 12 }}>Answers are not case sensitive. Make sure you will remember these.</p>
          <button type="button" onClick={submit} style={primaryBtn}>Create account</button>
          <button type="button" onClick={() => setRegisterStep("main")} style={ghostBtn}>Back</button>
        </div>
      ) : mode === "forgot" ? (
        <ForgotPasswordFlow palette={p} onBack={() => { setMode("login"); setStatus("Ready"); }} onDone={() => { setMode("login"); setStatus("Ready"); }} />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={labelStyle}>Phone or email<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} /></label>
          <div>
            <label style={labelStyle}>Password</label>
            <PasswordField value={password} onChange={setPassword} palette={p} />
          </div>
          <button type="button" onClick={submit} style={primaryBtn}>Log in</button>
          <button type="button" onClick={() => { setMode("forgot"); setStatus("Ready"); }} style={ghostBtn}>Forgot password?</button>
        </div>
      )}

      <p style={{ marginTop: 16, marginBottom: 0, color: p.textSecondary, fontSize: 12, textAlign: "center" }}>{status}</p>
    </section>
  );
}
