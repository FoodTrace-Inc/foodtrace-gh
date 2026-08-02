import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";

const COLORS = {
  background: "#05080b",
  card: "#071510",
  primary: "#0F6E56",
  error: "#F09595",
  success: "#5DCAA5",
  textPrimary: "#EAF6F0",
  textSecondary: "#7C9C8C",
  border: "#1B2A22",
};

type Step = "identifier" | "question1" | "question2" | "newPassword" | "success";

const STEP_INDEX: Record<Step, number> = { identifier: 1, question1: 2, question2: 3, newPassword: 4, success: 4 };

interface Props {
  apiBase: string;
  onDone: () => void;
  onBack: () => void;
}

function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("an uppercase letter");
  if (!/[0-9]/.test(password)) issues.push("a number");
  if (!/[!@#$%^&*]/.test(password)) issues.push("a special character (!@#$%^&*)");
  return issues;
}

export function ForgotPasswordScreen({ apiBase, onDone, onBack }: Props) {
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

  async function post(path: string, body: object) {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${apiBase}/auth/forgot-password/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // fetchWithTimeout() throws (not a resolved response) when there's no network path
      // to the server at all - a real connectivity issue, not a bad input.
      throw new Error("Could not connect to the server. Please check your internet connection and try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverMessage = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "";
      // Surface a friendly message for the identifier-lookup step instead of
      // a raw backend/database error string leaking through.
      const friendly = path === "start" && (!serverMessage || /isn't allowed|constraint|violat/i.test(serverMessage))
        ? "Please enter the email address or phone number you used to register."
        : serverMessage || "Something went wrong. Please try again.";
      throw new Error(friendly);
    }
    return data;
  }

  async function submitIdentifier() {
    if (!identifier.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await post("start", { identifier: identifier.trim() });
      setSessionToken(data.sessionToken);
      setQuestion1(data.question1);
      setAnswer("");
      setStep("question1");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion1() {
    if (!answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await post("verify-q1", { sessionToken, answer: answer.trim() });
      if (data.resetToken) {
        // Legacy account with only one security question set - the backend
        // skips straight to a reset token instead of asking for a Q2 that
        // doesn't exist.
        setSkippedQuestion2(true);
        setResetToken(data.resetToken);
        setStep("newPassword");
        return;
      }
      setSessionToken(data.sessionToken);
      setQuestion2(data.question2);
      setAnswer("");
      setStep("question2");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion2() {
    if (!answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await post("verify-q2", { sessionToken, answer: answer.trim() });
      setResetToken(data.resetToken);
      setStep("newPassword");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const issues = passwordIssues(newPassword);
    if (issues.length > 0) {
      setError(`Password must have ${issues.join(", ")}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("reset", { resetToken, newPassword });
      setStep("success");
      setTimeout(onDone, 3000);
    } catch (e: any) {
      setError(e.message);
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
    <View style={s.screen}>
      {step !== "success" ? (
        <View style={s.header}>
          <Pressable onPress={goBack} style={s.backBtn}>
            <Text style={s.backText}>{"< Back"}</Text>
          </Pressable>
          <View style={s.dots}>
            {Array.from({ length: dotsTotal }).map((_, i) => (
              <View key={i} style={[s.dot, i < dotsFilled ? s.dotFilled : null]} />
            ))}
          </View>
          <Text style={s.stepLabel}>Step {dotsFilled} of {dotsTotal}</Text>
        </View>
      ) : null}

      <View style={s.card}>
        {step === "identifier" ? (
          <>
            <Text style={s.title}>Reset your password</Text>
            <Text style={s.subtitle}>Enter the email or phone number on your account.</Text>
            <TextInput
              style={s.input}
              placeholder="Email or phone number"
              placeholderTextColor={COLORS.textSecondary}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable
              style={[s.primaryBtn, (!identifier.trim() || busy) ? s.btnDisabled : null]}
              disabled={!identifier.trim() || busy}
              onPress={submitIdentifier}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Continue</Text>}
            </Pressable>
          </>
        ) : null}

        {step === "question1" ? (
          <>
            <Text style={s.title}>Security question 1</Text>
            <Text style={s.subtitle}>{question1}</Text>
            <TextInput
              style={s.input}
              placeholder="Your answer"
              placeholderTextColor={COLORS.textSecondary}
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              keyboardType="default"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable
              style={[s.primaryBtn, (!answer.trim() || busy) ? s.btnDisabled : null]}
              disabled={!answer.trim() || busy}
              onPress={submitQuestion1}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Continue</Text>}
            </Pressable>
          </>
        ) : null}

        {step === "question2" ? (
          <>
            <Text style={s.title}>Security question 2</Text>
            <Text style={s.subtitle}>{question2}</Text>
            <TextInput
              style={s.input}
              placeholder="Your answer"
              placeholderTextColor={COLORS.textSecondary}
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              keyboardType="default"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable
              style={[s.primaryBtn, (!answer.trim() || busy) ? s.btnDisabled : null]}
              disabled={!answer.trim() || busy}
              onPress={submitQuestion2}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Continue</Text>}
            </Pressable>
          </>
        ) : null}

        {step === "newPassword" ? (
          <>
            <Text style={s.title}>Set a new password</Text>
            <Text style={s.subtitle}>At least 8 characters, one uppercase letter, one number, one special character.</Text>
            <TextInput
              style={s.input}
              placeholder="New password"
              placeholderTextColor={COLORS.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={s.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Pressable
              style={[s.primaryBtn, (!newPassword || !confirmPassword || busy) ? s.btnDisabled : null]}
              disabled={!newPassword || !confirmPassword || busy}
              onPress={submitNewPassword}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Reset password</Text>}
            </Pressable>
          </>
        ) : null}

        {step === "success" ? (
          <View style={{ alignItems: "center" }}>
            <Text style={s.successCheck}>✓</Text>
            <Text style={s.successTitle}>Password changed successfully</Text>
            <Text style={s.successSubtitle}>All your other sessions have been logged out for your security.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: { marginBottom: 16 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12 },
  backText: { color: COLORS.textSecondary, fontSize: 15 },
  dots: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotFilled: { backgroundColor: COLORS.primary },
  stepLabel: { color: COLORS.textSecondary, fontSize: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 16 },
  input: {
    backgroundColor: "#0A130F", borderColor: COLORS.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 15, marginBottom: 12,
  },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 10 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successCheck: { color: COLORS.success, fontSize: 48, marginBottom: 12 },
  successTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  successSubtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: "center" },
});
