import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { usePalette } from "../theme/ThemeContext";

interface Props {
  icon: IconName;
  label: string;
  onPress: () => void;
  tint?: string;
}

/**
 * A single tappable row used in the Account screen and similar settings
 * lists — icon + label + chevron, ProofLoop card styling.
 */
export function ProofActionCard({ icon, label, onPress, tint }: Props) {
  const p = usePalette();
  const color = tint ?? p.textPrimary;

  return (
    <Pressable style={[styles.row, { backgroundColor: p.cardBg, borderColor: p.border }]} onPress={onPress}>
      <View style={styles.left}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <Icon name="chevron-forward" size={16} color={p.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 14, fontWeight: "600" },
});
