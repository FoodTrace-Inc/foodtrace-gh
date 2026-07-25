import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { usePalette } from "../theme/ThemeContext";
import type { PlanDef } from "./SubscriptionPlansScreen";

type Method = "mtn" | "vodafone" | "airteltigo" | "card";

const METHODS: { key: Method; label: string }[] = [
  { key: "mtn", label: "MTN Mobile Money" },
  { key: "vodafone", label: "Vodafone Cash" },
  { key: "airteltigo", label: "AirtelTigo Money" },
  { key: "card", label: "Ghana Debit/Credit Card" },
];

interface Props {
  apiBase: string;
  token: string;
  userEmail: string;
  plan: PlanDef;
  onSuccess: (result: { plan: string; expiryDate: string }) => void;
  onFailure: (reason: string) => void;
  onBack: () => void;
}

export function PaymentScreen({ apiBase, token, userEmail, plan, onSuccess, onFailure, onBack }: Props) {
  const p = usePalette();
  const [method, setMethod] = useState<Method>("mtn");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function pay() {
    if (method !== "card" && !/^0\d{9}$/.test(phone.trim())) {
      setStatus("Enter a valid Ghana phone number, e.g. 0241234567.");
      return;
    }
    setBusy(true);
    setStatus("Starting payment...");
    try {
      const initRes = await fetch(`${apiBase}/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: userEmail, planType: plan.key, currency: "GHS", phone: method === "card" ? undefined : phone.trim() }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || initData.message || "Could not start payment.");

      const { authorizationUrl, reference } = initData;
      setStatus("Opening Paystack...");
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, undefined);

      // The user may close the browser before finishing, or Paystack may
      // redirect back - either way, verify against our backend, which is
      // the source of truth, rather than trusting the browser result type.
      setStatus("Verifying payment...");
      const verifyRes = await fetch(`${apiBase}/payments/verify/${reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Could not verify payment.");

      if (verifyData.status === "success") {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        onSuccess({ plan: plan.name, expiryDate: expiry.toISOString().slice(0, 10) });
      } else {
        onFailure(result.type === "cancel" ? "Payment failed or cancelled." : "Payment failed or cancelled.");
      }
    } catch (error) {
      onFailure(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, padding: 18 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 12 }}>
        <Text style={{ color: p.accent, fontWeight: "700" }}>{"< Back"}</Text>
      </Pressable>
      <Text style={[styles.title, { color: p.textPrimary }]}>{plan.name} plan</Text>
      <Text style={[styles.price, { color: p.textPrimary }]}>GHS {plan.priceGhs}/{plan.period}</Text>

      <Text style={[styles.sectionLabel, { color: p.textSecondary }]}>Payment method</Text>
      {METHODS.map((m) => (
        <Pressable
          key={m.key}
          style={[styles.methodRow, { backgroundColor: p.cardBg, borderColor: method === m.key ? p.accent : p.border }]}
          onPress={() => setMethod(m.key)}
        >
          <View style={[styles.radio, { borderColor: method === m.key ? p.accent : p.textSecondary }]}>
            {method === m.key ? <View style={[styles.radioDot, { backgroundColor: p.accent }]} /> : null}
          </View>
          <Text style={{ color: p.textPrimary, fontSize: 14 }}>{m.label}</Text>
        </Pressable>
      ))}

      {method !== "card" ? (
        <TextInput
          placeholder="Mobile Money number, e.g. 0241234567"
          placeholderTextColor="#748089"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={[styles.input, { backgroundColor: p.fieldBg, color: p.textPrimary, borderColor: p.border }]}
        />
      ) : (
        <Text style={[styles.hint, { color: p.textSecondary }]}>You'll enter your card details securely on Paystack's payment page.</Text>
      )}

      {status ? <Text style={[styles.status, { color: p.textSecondary }]}>{status}</Text> : null}

      <Pressable style={[styles.payBtn, { backgroundColor: p.accent, opacity: busy ? 0.6 : 1 }]} onPress={() => void pay()} disabled={busy}>
        {busy ? <ActivityIndicator color={p.onAccent} /> : <Text style={[styles.payBtnText, { color: p.onAccent }]}>Pay GHS {plan.priceGhs}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800" },
  price: { fontSize: 16, fontWeight: "600", marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  input: { borderRadius: 12, minHeight: 50, paddingHorizontal: 14, borderWidth: 1, marginTop: 8, marginBottom: 6, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 8, marginBottom: 6, lineHeight: 17 },
  status: { fontSize: 12, marginTop: 8 },
  payBtn: { marginTop: 20, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  payBtnText: { fontWeight: "800", fontSize: 15 },
});
