import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
  dark?: boolean;
}

/** A single selectable filter chip (Market screen's All/Food/Drugs/Farms row). */
export function FilterPill({ label, active, onPress, dark = true }: Props) {
  return (
    <Pressable
      style={[
        styles.pill,
        dark ? styles.pillDark : styles.pillLight,
        active && styles.pillActive,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, dark && styles.textDark, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  pillDark: { backgroundColor: "#1c2024" },
  pillLight: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(24,23,22,0.08)" },
  pillActive: { backgroundColor: "#18a2a6" },
  text: { fontSize: 13, fontWeight: "600", color: "#716b63" },
  textDark: { color: "#a39d94" },
  textActive: { color: "#ffffff" },
});
