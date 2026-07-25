import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/ThemeContext";

interface SuccessProps {
  success: true;
  planName: string;
  expiryDate: string;
  onContinue: () => void;
}

interface FailureProps {
  success: false;
  reason: string;
  onRetry: () => void;
  onChooseMethod: () => void;
}

type Props = SuccessProps | FailureProps;

export function PaymentResultScreen(props: Props) {
  const p = usePalette();

  if (props.success) {
    return (
      <View style={[styles.wrap, { backgroundColor: p.pageBg }]}>
        <View style={[styles.iconCircle, { backgroundColor: "rgba(119,199,162,0.15)" }]}>
          <Text style={[styles.icon, { color: p.accent }]}>✓</Text>
        </View>
        <Text style={[styles.title, { color: p.textPrimary }]}>Payment successful!</Text>
        <Text style={[styles.body, { color: p.textSecondary }]}>
          Your {props.planName} plan is now active.{"\n"}Renews on {props.expiryDate}.
        </Text>
        <Pressable style={[styles.primaryBtn, { backgroundColor: p.accent }]} onPress={props.onContinue}>
          <Text style={[styles.primaryBtnText, { color: p.onAccent }]}>Start using FoodTrace GH</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: p.pageBg }]}>
      <View style={[styles.iconCircle, { backgroundColor: "rgba(224,71,92,0.15)" }]}>
        <Text style={[styles.icon, { color: "#e0475c" }]}>✕</Text>
      </View>
      <Text style={[styles.title, { color: p.textPrimary }]}>Payment failed</Text>
      <Text style={[styles.body, { color: p.textSecondary }]}>{props.reason}</Text>
      <Pressable style={[styles.primaryBtn, { backgroundColor: p.accent }]} onPress={props.onRetry}>
        <Text style={[styles.primaryBtnText, { color: p.onAccent }]}>Try again</Text>
      </Pressable>
      <Pressable style={[styles.secondaryBtn, { borderColor: p.border }]} onPress={props.onChooseMethod}>
        <Text style={{ color: p.textSecondary, fontWeight: "600" }}>Choose different method</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  icon: { fontSize: 46, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  body: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 26 },
  primaryBtn: { width: "100%", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  primaryBtnText: { fontWeight: "800", fontSize: 15 },
  secondaryBtn: { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
});
