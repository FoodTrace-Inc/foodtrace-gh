import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/ThemeContext";

export interface PlanDef {
  key: string;
  name: string;
  priceGhs: number;
  period: string;
  features: string[];
  popular?: boolean;
}

export const SELLER_PLANS: PlanDef[] = [
  { key: "micro", name: "Micro", priceGhs: 50, period: "month", features: ["Up to 10 products", "10 QR codes"] },
  { key: "small", name: "Small", priceGhs: 150, period: "month", features: ["Up to 50 products", "50 QR codes"], popular: true },
  { key: "medium", name: "Medium", priceGhs: 400, period: "month", features: ["Up to 200 products", "200 QR codes"] },
  { key: "large", name: "Large", priceGhs: 1000, period: "month", features: ["Unlimited products", "Unlimited QR codes"] },
];

export const CONSUMER_PLANS: PlanDef[] = [
  { key: "premium", name: "Premium", priceGhs: 10, period: "month", features: ["Unlimited scans", "Full scan history", "Watchlist with recall alerts", "Priority customer support"] },
];

interface Props {
  plans: PlanDef[];
  currentPlan?: string | null;
  onSelectPlan: (planKey: string) => void;
  onBack: () => void;
}

export function SubscriptionPlansScreen({ plans, currentPlan, onSelectPlan, onBack }: Props) {
  const p = usePalette();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.pageBg }} contentContainerStyle={styles.scroll}>
      <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 12 }}>
        <Text style={{ color: p.accent, fontWeight: "700" }}>{"< Back"}</Text>
      </Pressable>
      <Text style={[styles.title, { color: p.textPrimary }]}>Choose your plan</Text>
      <Text style={[styles.sub, { color: p.textSecondary }]}>Prices in Ghana cedis (GHS). Cancel anytime.</Text>

      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        return (
          <View
            key={plan.key}
            style={[
              styles.card,
              { backgroundColor: p.cardBg, borderColor: plan.popular ? p.accent : p.border, borderWidth: plan.popular ? 2 : 1 },
            ]}
          >
            {plan.popular ? (
              <View style={[styles.badge, { backgroundColor: p.accent }]}>
                <Text style={[styles.badgeText, { color: p.onAccent }]}>Most popular</Text>
              </View>
            ) : null}
            <Text style={[styles.planName, { color: p.textPrimary }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: p.textPrimary }]}>
              GHS {plan.priceGhs} <Text style={[styles.planPeriod, { color: p.textSecondary }]}>/{plan.period}</Text>
            </Text>
            {plan.features.map((f) => (
              <Text key={f} style={[styles.feature, { color: p.textSecondary }]}>• {f}</Text>
            ))}
            <Pressable
              style={[styles.subscribeBtn, { backgroundColor: isCurrent ? p.border : p.accent }]}
              disabled={isCurrent}
              onPress={() => onSelectPlan(plan.key)}
            >
              <Text style={[styles.subscribeBtnText, { color: isCurrent ? p.textSecondary : p.onAccent }]}>
                {isCurrent ? "Current plan" : "Subscribe now"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 18 },
  card: { borderRadius: 20, padding: 18, marginBottom: 14, position: "relative" },
  badge: { position: "absolute", top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10.5, fontWeight: "800" },
  planName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  planPrice: { fontSize: 26, fontWeight: "800", marginBottom: 10 },
  planPeriod: { fontSize: 13, fontWeight: "500" },
  feature: { fontSize: 13, marginBottom: 4 },
  subscribeBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  subscribeBtnText: { fontWeight: "700", fontSize: 14 },
});
