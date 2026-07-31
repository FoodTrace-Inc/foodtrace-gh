import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  apiBase: string;
  accentColor: string;
  textColor: string;
  secondaryColor: string;
}

export function LiveScanCounter({ apiBase, accentColor, textColor, secondaryColor }: Props) {
  const [target, setTarget] = useState<number | null>(null);
  const displayValue = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const id = displayValue.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => displayValue.removeListener(id);
  }, [displayValue]);

  async function load() {
    try {
      const res = await fetch(`${apiBase}/stats/total-scans`);
      if (!res.ok) return;
      const data = (await res.json()) as { totalScans?: number };
      if (typeof data.totalScans === "number") {
        setTarget(data.totalScans);
      }
    } catch {
      // Network hiccup - keep showing the last known value.
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (target === null) return;
    Animated.timing(displayValue, { toValue: target, duration: 1500, useNativeDriver: false }).start();
  }, [target, displayValue]);

  if (target === null) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: secondaryColor }]}>Ghana has made</Text>
      <Text style={[styles.number, { color: accentColor }]}>{displayed.toLocaleString()}</Text>
      <Text style={[styles.kicker, { color: secondaryColor }]}>safe product scans</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 14 },
  kicker: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  number: { fontSize: 34, fontWeight: "800", marginVertical: 2 },
});
