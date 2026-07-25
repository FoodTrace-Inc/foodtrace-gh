import React, { type ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { usePalette } from "../theme/ThemeContext";

interface Props {
  kicker?: string;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}

/**
 * The base ProofLoop card: a large rounded surface used for every "proof"
 * unit across the app (stat cards, dashboard metrics, marketplace posts).
 */
export function ProofCard({ kicker, title, subtitle, children, style, dark = false }: Props) {
  const p = usePalette();
  const bg = dark ? "#181716" : p.cardBg;
  const fg = dark ? "#fff9ec" : p.textPrimary;
  const muted = dark ? "#a39d94" : p.textSecondary;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: p.border }, style]}>
      {kicker ? <Text style={[styles.kicker, { color: p.signalCyan }]}>{kicker}</Text> : null}
      {title ? <Text style={[styles.title, { color: fg }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, borderWidth: 1 },
  kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 12 },
});
