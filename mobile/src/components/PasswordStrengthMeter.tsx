import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  return score;
}

export function isPasswordStrongEnough(password: string): boolean {
  return passwordScore(password) === 4;
}

const LEVELS = [
  { color: "#3a4a42", label: "" },
  { color: "#e0475c", label: "Too weak" },
  { color: "#e0475c", label: "Too weak" },
  { color: "#E0A83B", label: "Getting better" },
  { color: "#4ade80", label: "Strong password" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score];
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(score / 4) * 100}%`, backgroundColor: level.color }]} />
      </View>
      {password.length > 0 ? (
        <Text style={[styles.label, { color: level.color }]}>
          {score === 4 ? "✓ " : ""}{level.label || "Must be at least 8 characters, with an uppercase letter, a number, and a special character (!@#$%^&*)."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: -4, marginBottom: 10 },
  track: { height: 5, borderRadius: 3, backgroundColor: "#1c2620", overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  label: { fontSize: 11, marginTop: 5 },
});
