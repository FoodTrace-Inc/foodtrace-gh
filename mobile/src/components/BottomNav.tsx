import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { usePalette } from "../theme/ThemeContext";

export interface BottomNavTab<T extends string> {
  key: T;
  icon: IconName;
  iconActive: IconName;
  label: string;
}

interface Props<T extends string> {
  tabs: readonly BottomNavTab<T>[];
  active: T;
  onChange: (tab: T) => void;
}

/** The 5-tab consumer bottom nav (Home/Market/Scan/History/Account), ProofLoop styling. */
export function BottomNav<T extends string>({ tabs, active, onChange }: Props<T>) {
  const p = usePalette();
  return (
    <View style={[styles.bar, { backgroundColor: p.cardBg, borderTopColor: p.border }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.item} onPress={() => onChange(tab.key)}>
            <Icon name={isActive ? tab.iconActive : tab.icon} size={22} color={isActive ? p.accent : p.textSecondary} />
            <Text style={[styles.label, { color: isActive ? p.accent : p.textSecondary }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  label: { fontSize: 11, fontWeight: "600" },
});
