import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/ThemeContext";

interface SubscriptionStatus {
  plan: string;
  status: string;
  expiryDate: string;
  daysLeft: number;
}

interface PaymentRecord {
  reference: string;
  amount: number;
  currency: string;
  planType: string;
  status: string;
  channel: string | null;
  createdAt: string;
}

interface Props {
  apiBase: string;
  token: string;
  userId: string;
  onUpgrade: () => void;
  onBack: () => void;
}

export function SubscriptionManagementScreen({ apiBase, token, userId, onUpgrade, onBack }: Props) {
  const p = usePalette();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [subRes, histRes] = await Promise.all([
        fetch(`${apiBase}/payments/subscription/${userId}`),
        fetch(`${apiBase}/payments/history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const subData = await subRes.json();
      const histData = await histRes.json();
      setSubscription(subData);
      setHistory(Array.isArray(histData.payments) ? histData.payments : []);
    } catch {
      setStatus("Could not load subscription details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function cancel() {
    setStatus("Cancelling...");
    try {
      const res = await fetch(`${apiBase}/payments/subscription/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not cancel subscription.");
      setStatus("Subscription cancelled.");
      void load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not cancel subscription.");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: p.pageBg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={p.accent} />
      </View>
    );
  }

  const isActive = subscription?.status === "active";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.pageBg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 12 }}>
        <Text style={{ color: p.accent, fontWeight: "700" }}>{"< Back"}</Text>
      </Pressable>
      <Text style={[styles.title, { color: p.textPrimary }]}>Your subscription</Text>

      <View style={[styles.card, { backgroundColor: p.cardBg, borderColor: p.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: p.textSecondary }]}>Plan</Text>
          <Text style={[styles.value, { color: p.textPrimary, textTransform: "capitalize" }]}>{subscription?.plan ?? "None"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: p.textSecondary }]}>Status</Text>
          <Text style={[styles.value, { color: isActive ? p.accent : "#e0475c", textTransform: "capitalize" }]}>{subscription?.status ?? "None"}</Text>
        </View>
        {subscription?.plan !== "none" ? (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, { color: p.textSecondary }]}>Days remaining</Text>
              <Text style={[styles.value, { color: p.textPrimary }]}>{subscription?.daysLeft ?? 0}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: p.textSecondary }]}>Next payment</Text>
              <Text style={[styles.value, { color: p.textPrimary }]}>{subscription?.expiryDate}</Text>
            </View>
          </>
        ) : null}
      </View>

      <Pressable style={[styles.primaryBtn, { backgroundColor: p.accent }]} onPress={onUpgrade}>
        <Text style={{ color: p.onAccent, fontWeight: "800" }}>{isActive ? "Upgrade plan" : "Choose a plan"}</Text>
      </Pressable>
      {isActive ? (
        <Pressable style={[styles.secondaryBtn, { borderColor: p.border }]} onPress={() => void cancel()}>
          <Text style={{ color: "#e0475c", fontWeight: "700" }}>Cancel subscription</Text>
        </Pressable>
      ) : null}
      {status ? <Text style={{ color: p.textSecondary, fontSize: 12, marginTop: 8 }}>{status}</Text> : null}

      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>Payment history</Text>
      {history.length === 0 ? (
        <Text style={{ color: p.textSecondary, fontSize: 13 }}>No payments yet.</Text>
      ) : (
        history.map((h) => (
          <View key={h.reference} style={[styles.historyRow, { borderColor: p.border }]}>
            <View>
              <Text style={{ color: p.textPrimary, fontWeight: "600", textTransform: "capitalize" }}>{h.planType} plan</Text>
              <Text style={{ color: p.textSecondary, fontSize: 11 }}>{new Date(h.createdAt).toLocaleDateString()} - {h.channel ?? "-"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: p.textPrimary, fontWeight: "700" }}>GHS {h.amount}</Text>
              <Text style={{ color: h.status === "success" ? p.accent : h.status === "failed" ? "#e0475c" : "#efb64f", fontSize: 11, textTransform: "capitalize" }}>{h.status}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginBottom: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: "700" },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  secondaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 10 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
});
