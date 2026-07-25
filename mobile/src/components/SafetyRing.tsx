// Signature scan-result visual - a ring of dots (same design language as
// the web SafetyRing) built from plain Views so it needs no native SVG
// dependency. Each dot is absolutely positioned via trig math.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";

type Status = "safe" | "caution" | "recalled";

const PALETTE: Record<Status, { color: string; icon: IconName; label: string }> = {
  safe: { color: "#18a2a6", icon: "checkmark-circle", label: "Verified safe" },
  caution: { color: "#edb54c", icon: "alert-circle", label: "Caution" },
  recalled: { color: "#e0475c", icon: "close-circle", label: "Recalled" },
};

export function statusToRingStatus(status: string): Status {
  const s = status.toLowerCase();
  if (s.includes("recall")) return "recalled";
  if (s.includes("caution") || s.includes("unverified") || s.includes("pending")) return "caution";
  return "safe";
}

const DOT_COUNT = 36;

export function SafetyRing({ status, size = 176 }: { status: Status; size?: number }) {
  const { color, icon, label } = PALETTE[status];
  const radius = size / 2 - 10;
  const center = size / 2;

  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const angle = (i / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const wobble = 0.55 + 0.45 * Math.abs(Math.sin(angle * 3 + i));
    const dotSize = 4.4 + wobble * 3.2;
    return { x, y, dotSize, opacity: 0.35 + wobble * 0.65 };
  });

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: d.x - d.dotSize / 2,
            top: d.y - d.dotSize / 2,
            width: d.dotSize,
            height: d.dotSize,
            borderRadius: d.dotSize / 2,
            backgroundColor: color,
            opacity: d.opacity,
          }}
        />
      ))}
      <View style={styles.center} pointerEvents="none">
        <Icon name={icon} size={size * 0.26} color={color} />
        <Text style={[styles.label, { fontSize: size * 0.085 }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  icon: {
    fontWeight: "800",
  },
  label: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    paddingHorizontal: 10,
  },
});
