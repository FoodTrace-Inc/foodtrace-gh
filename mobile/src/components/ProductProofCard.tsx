import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ProofStatusBadge, statusFor } from "./ProofStatusBadge";

export const DOMAIN_GRADIENT: Record<string, [string, string]> = {
  food: ["#edb54c", "#18a2a6"],
  drug: ["#1b6d8f", "#18a2a6"],
  farm: ["#c9d95f", "#18a2a6"],
};

interface Props {
  name: string;
  sellerName: string;
  domain: "food" | "drug" | "farm";
  status: string;
  onPress?: () => void;
}

/** Compact product summary card — seller marketplace listings, search results. */
export function ProductProofCard({ name, sellerName, domain, status, onPress }: Props) {
  const gradient = DOMAIN_GRADIENT[domain] ?? DOMAIN_GRADIENT.food;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.imageArea} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.seller} numberOfLines={1}>{sellerName}</Text>
        <ProofStatusBadge status={statusFor(status)} size="small" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, borderRadius: 18, backgroundColor: "#181716", overflow: "hidden", marginRight: 10 },
  imageArea: { height: 90, width: "100%" },
  body: { padding: 10, gap: 6 },
  name: { color: "#fff9ec", fontSize: 13, fontWeight: "700" },
  seller: { color: "#a39d94", fontSize: 11 },
});
