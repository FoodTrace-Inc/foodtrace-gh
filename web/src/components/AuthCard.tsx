import { useMemo, useState } from "react";
import type { AuthResponse, UserRole } from "@foodtrace/shared";
import { apiBase, readJsonResponse, getApiErrorMessage, getFriendlyErrorMessage } from "../lib/api";
import { styles } from "../lib/styles";

type Mode = "login" | "register" | "forgot";

interface Props {
  session: AuthResponse | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleList: UserRole[];
  onSignIn: (session: AuthResponse) => void;
  onSignOut: () => void;
}

export function AuthCard({ session, role, setRole, roleList, onSignIn, onSignOut }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("Ready");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const displayName = session?.user.fullName || session?.user.email || session?.user.phone || "Account";
  const avatarLabel = useMemo(() => {
    const raw = (session?.user.fullName || session?.user.email || session?.user.phone || "").trim();
    if (!raw) return "FT";
    const parts = raw.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "FT";
  }, [session?.user.email, session?.user.fullName, session?.user.phone]);

  async function submit() {
    setStatus("Sending request...");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { identifier, password }
          : { fullName, phone: phone || null, email: email || null, password, role, language };

      const response = await fetch(`${apiBase}${endpoint}`, {
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

  async function requestReset() {
    setStatus("Sending request...");
    try {
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: forgotEmail }),
      });
      const data = (await readJsonResponse(response)) as { message?: string; error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(data.error, "Could not send reset code"));
      setCodeSent(true);
      setStatus(data.message ?? "Check your email for a reset code.");
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Could not send reset code"));
    }
  }

  async function submitReset() {
    setStatus("Sending request...");
    try {
      const response = await fetch(`${apiBase}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
      });
      const data = (await readJsonResponse(response)) as { message?: string; error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(data.error, "Could not reset password"));
      setMode("login");
      setIdentifier(forgotEmail);
      setPassword("");
      setForgotEmail(""); setResetCode(""); setNewPassword(""); setCodeSent(false);
      setStatus(data.message ?? "Password updated. Log in with your new password.");
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Could not reset password"));
    }
  }

  if (session) {
    return (
      <section style={styles.card}>
        <div style={styles.signedIn}>
          <div style={styles.userRow}>
            <div style={styles.avatar}>{avatarLabel}</div>
            <div style={styles.userMeta}>
              <p style={styles.userName}>{displayName}</p>
              <p style={styles.userSub}>{session.user.role}</p>
            </div>
            <button type="button" onClick={onSignOut} style={styles.secondaryButton}>
              Log out
            </button>
          </div>
          <p style={styles.status}>{status}</p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <div style={styles.segmented}>
        <button style={mode === "login" ? styles.segmentActive : styles.segment} onClick={() => setMode("login")} type="button">
          Log in
        </button>
        <button style={mode === "register" ? styles.segmentActive : styles.segment} onClick={() => setMode("register")} type="button">
          Create account
        </button>
      </div>

      {mode === "register" ? (
        <div style={styles.form}>
          <label style={styles.label}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={styles.input}>
              {roleList.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={styles.label}>Language<input value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.input} /></label>
          <button type="button" onClick={submit} style={styles.primaryButton}>Create account</button>
        </div>
      ) : mode === "forgot" ? (
        <div style={styles.form}>
          <label style={styles.label}>Email address<input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={styles.input} disabled={codeSent} /></label>
          {codeSent ? (
            <>
              <p style={styles.status}>We sent a code to {forgotEmail}. Enter it below with your new password.</p>
              <label style={styles.label}>Reset code<input value={resetCode} onChange={(e) => setResetCode(e.target.value)} style={styles.input} maxLength={6} /></label>
              <label style={styles.label}>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} /></label>
              <button type="button" onClick={submitReset} style={styles.primaryButton}>Reset password</button>
              <button type="button" onClick={() => { setCodeSent(false); void requestReset(); }} style={styles.secondaryButton}>Resend code</button>
            </>
          ) : (
            <button type="button" onClick={requestReset} style={styles.primaryButton}>Send reset code</button>
          )}
          <button type="button" onClick={() => { setMode("login"); setCodeSent(false); setStatus("Ready"); }} style={styles.secondaryButton}>Back to log in</button>
        </div>
      ) : (
        <div style={styles.form}>
          <label style={styles.label}>Phone or email<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={styles.input} /></label>
          <label style={styles.label}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} /></label>
          <button type="button" onClick={submit} style={styles.primaryButton}>Log in</button>
          <button type="button" onClick={() => { setMode("forgot"); setForgotEmail(identifier.includes("@") ? identifier : ""); setStatus("Ready"); }} style={styles.secondaryButton}>Forgot password?</button>
        </div>
      )}

      <p style={styles.status}>{status}</p>
    </section>
  );
}
