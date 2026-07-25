import React, { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/ThemeContext";

interface Props {
  kicker: string;
  title?: string;
  children?: ReactNode;
}

/**
 * Standard section card used inside the four role dashboards (Farm/Batch/
 * Drug Proof Hub, Safety Command Center) - same visual language as
 * ProofCard, kept separate so dashboard sections read as distinct blocks.
 */
export function RoleDashboardCard({ kicker, title, children }: Props) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.cardBg, borderColor: p.border }]}>
      <Text style={[styles.kicker, { color: p.signalCyan }]}>{kicker}</Text>
      {title ? <Text style={[styles.title, { color: p.textPrimary }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12 },
  kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
});
