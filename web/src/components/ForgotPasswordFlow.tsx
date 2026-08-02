import { useState } from "react";
import type { CSSProperties } from "react";
import { apiBase, readJsonResponse, getApiErrorMessage, getFriendlyErrorMessage } from "../lib/api";
import { PasswordField } from "./PasswordField";
import type { Palette } from "../theme/ThemeContext";

const COLORS = {
  background: "#05080b",
  card: "#071510",
  primary: "#0F6E56",
  error: "#F09595",
  success: "#5DCAA5",
};

type Step = "identifier" | "question1" | "question2" | "newPassword" | "success";
const STEP_INDEX: Record<Step, number> = { identifier: 1, question1: 2, question2: 3, newPassword: 4, success: 4 };

function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("an uppercase letter");
  if (!/[0-9]/.test(password)) issues.push("a number");
  if (!/[!@#$%^&*]/.test(password)) issues.push("a special character (!@#$%^&*)");
  return issues;
}

interface Props {
  palette: Palette;
  onBack: () => void;
  onDone: () => void;
}

export function ForgotPasswordFlow({ palette: p, onBack, onDone }: Props) {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [question1, setQuestion1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [skippedQuestion2, setSkippedQuestion2] = useState(false);
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const labelStyle: CSSProperties = { display: "block", fontSize: 11, color: p.textSecondary, margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
  const fieldStyle: CSSProperties = { width: "100%", background: p.fieldBg, border: `1px solid ${p.border}`, borderRadius: 12, padding: "12px 14px", color: p.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const primaryBtn: CSSProperties = { width: "100%", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const disabledBtn: CSSProperties = { ...primaryBtn, opacity: 0.5, cursor: "not-allowed" };
  const ghostBtn: CSSProperties = { width: "100%", background: "transparent", color: p.textSecondary, border: `1px solid ${p.border}`, borderRadius: 12, padding: "11px", fontWeight: 600, fontSize: 13, cursor: "pointer" };

  async function post(path: string, body: object) {
    let response: Response;
    try {
      response = await fetch(`${apiBase}/auth/forgot-password/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch {
      throw new Error("Could not connect to the server. Please check your internet connection and try again.");
    }
    const data = (await readJsonResponse(response)) as Record<string, unknown> & { error?: unknown };
    if (!response.ok) {
      const serverMessage = getApiErrorMessage(data.error, "");
      const friendly = path === "start" && (!serverMessage || /isn't allowed|constraint|violat/i.test(serverMessage))
        ? "Please enter the email address or phone number you used to register."
        : serverMessage || "Something went wrong. Please try again.";
      throw new Error(friendly);
    }
    return data;
  }

  async function submitIdentifier() {
    if (!identifier.trim()) return;
    setBusy(true); setError("");
    try {
      const data = await post("start", { identifier: identifier.trim() });
      setSessionToken(String(data.sessionToken));
      setQuestion1(String(data.question1));
      setAnswer("");
      setStep("question1");
    } catch (e) {
      setError(getFriendlyErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion1() {
    if (!answer.trim()) return;
    setBusy(true); setError("");
    try {
      const data = await post("verify-q1", { sessionToken, answer: answer.trim() });
      if (data.resetToken) {
        // Legacy account with only one security question set - the backend
        // skips straight to a reset token instead of asking for a Q2 that
        // doesn't exist.
        setSkippedQuestion2(true);
        setResetToken(String(data.resetToken));
        setStep("newPassword");
        return;
      }
      setSessionToken(String(data.sessionToken));
      setQuestion2(String(data.question2));
      setAnswer("");
      setStep("question2");
    } catch (e) {
      setError(getFriendlyErrorMessage(e, "Incorrect answer"));
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion2() {
    if (!answer.trim()) return;
    setBusy(true); setError("");
    try {
      const data = await post("verify-q2", { sessionToken, answer: answer.trim() });
      setResetToken(String(data.resetToken));
      setStep("newPassword");
    } catch (e) {
      setError(getFriendlyErrorMessage(e, "Incorrect answer"));
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    const issues = passwordIssues(newPassword);
    if (issues.length > 0) { setError(`Password must have ${issues.join(", ")}.`); return; }
    setBusy(true); setError("");
    try {
      await post("reset", { resetToken, newPassword });
      setStep("success");
      setTimeout(onDone, 3000);
    } catch (e) {
      setError(getFriendlyErrorMessage(e, "Could not reset password"));
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    setError("");
    if (step === "identifier") { onBack(); return; }
    if (step === "question1") { setStep("identifier"); return; }
    if (step === "question2") { setStep("question1"); return; }
    if (step === "newPassword") {
      if (skippedQuestion2) { setSkippedQuestion2(false); setStep("question1"); return; }
      setStep("question2");
      return;
    }
  }

  const dotsTotal = 4;
  const dotsFilled = STEP_INDEX[step];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {step !== "success" ? (
        <div>
          <button type="button" onClick={goBack} style={{ background: "none", border: "none", color: p.textSecondary, cursor: "pointer", padding: 0, marginBottom: 10, fontSize: 13 }}>
            {"< Back"}
          </button>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {Array.from({ length: dotsTotal }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i < dotsFilled ? COLORS.primary : p.border }} />
            ))}
          </div>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 12 }}>Step {dotsFilled} of {dotsTotal}</p>
        </div>
      ) : null}

      {step === "identifier" ? (
        <>
          <p style={{ margin: 0, color: p.textPrimary, fontSize: 15, fontWeight: 700 }}>Enter the email or phone number on your account.</p>
          <label style={labelStyle}>Email or phone
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          {error ? <p style={{ color: COLORS.error, fontSize: 13, margin: 0 }}>{error}</p> : null}
          <button type="button" disabled={!identifier.trim() || busy} onClick={submitIdentifier} style={!identifier.trim() || busy ? disabledBtn : primaryBtn}>
            {busy ? "Please wait..." : "Continue"}
          </button>
        </>
      ) : null}

      {step === "question1" ? (
        <>
          <p style={{ margin: 0, color: p.textPrimary, fontSize: 15, fontWeight: 700 }}>Security question 1</p>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 13 }}>{question1}</p>
          <label style={labelStyle}>Your answer
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          {error ? <p style={{ color: COLORS.error, fontSize: 13, margin: 0 }}>{error}</p> : null}
          <button type="button" disabled={!answer.trim() || busy} onClick={submitQuestion1} style={!answer.trim() || busy ? disabledBtn : primaryBtn}>
            {busy ? "Please wait..." : "Continue"}
          </button>
        </>
      ) : null}

      {step === "question2" ? (
        <>
          <p style={{ margin: 0, color: p.textPrimary, fontSize: 15, fontWeight: 700 }}>Security question 2</p>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 13 }}>{question2}</p>
          <label style={labelStyle}>Your answer
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
          </label>
          {error ? <p style={{ color: COLORS.error, fontSize: 13, margin: 0 }}>{error}</p> : null}
          <button type="button" disabled={!answer.trim() || busy} onClick={submitQuestion2} style={!answer.trim() || busy ? disabledBtn : primaryBtn}>
            {busy ? "Please wait..." : "Continue"}
          </button>
        </>
      ) : null}

      {step === "newPassword" ? (
        <>
          <p style={{ margin: 0, color: p.textPrimary, fontSize: 15, fontWeight: 700 }}>Set a new password</p>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 12 }}>At least 8 characters, one uppercase letter, one number, one special character (!@#$%^&*).</p>
          <div>
            <label style={labelStyle}>New password</label>
            <PasswordField value={newPassword} onChange={setNewPassword} palette={p} />
          </div>
          <div>
            <label style={labelStyle}>Confirm new password</label>
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} palette={p} />
          </div>
          {error ? <p style={{ color: COLORS.error, fontSize: 13, margin: 0 }}>{error}</p> : null}
          <button type="button" disabled={!newPassword || !confirmPassword || busy} onClick={submitNewPassword} style={!newPassword || !confirmPassword || busy ? disabledBtn : primaryBtn}>
            {busy ? "Please wait..." : "Reset password"}
          </button>
        </>
      ) : null}

      {step === "success" ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 40, color: COLORS.success, marginBottom: 10 }}>✓</div>
          <p style={{ margin: "0 0 6px", color: p.textPrimary, fontWeight: 700, fontSize: 16 }}>Password changed successfully</p>
          <p style={{ margin: 0, color: p.textSecondary, fontSize: 13 }}>All your other sessions have been logged out for your security.</p>
        </div>
      ) : null}
    </div>
  );
}
