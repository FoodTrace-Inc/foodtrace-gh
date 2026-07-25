import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ProofStatus = "safe" | "caution" | "recalled" | "not_found" | "unverified";

const STATUS_STYLE: Record<ProofStatus, { bg: string; fg: string; label: string }> = {
  safe: { bg: "rgba(24,162,166,0.14)", fg: "#0f6f6f", label: "SAFE" },
  caution: { bg: "rgba(237,181,76,0.18)", fg: "#8a6414", label: "CAUTION" },
  recalled: { bg: "rgba(224,71,92,0.15)", fg: "#a3283a", label: "RECALLED" },
  not_found: { bg: "rgba(113,107,99,0.16)", fg: "#716b63", label: "NOT_FOUND" },
  unverified: { bg: "rgba(237,181,76,0.18)", fg: "#8a6414", label: "UNVERIFIED" },
};

export function statusFor(status: string): ProofStatus {
  const s = status.toLowerCase();
  if (s.includes("recall")) return "recalled";
  if (s.includes("not_found") || s.includes("not found")) return "not_found";
  if (s.includes("unverified") || s.includes("pending") || s.includes("caution")) return "caution";
  return "safe";
}

interface Props {
  status: ProofStatus;
  size?: "small" | "medium";
}

export function ProofStatusBadge({ status, size = "medium" }: Props) {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.not_found;
  return (
    <View style={[styles.badge, size === "small" && styles.badgeSmall, { backgroundColor: st.bg }]}>
      <Text style={[styles.text, size === "small" && styles.textSmall, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  badgeSmall: { paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  textSmall: { fontSize: 9 },
});
