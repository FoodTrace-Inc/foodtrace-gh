import React from "react";
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

/** Thin wrapper so every screen references icons by a stable name instead of importing Ionicons directly. */
export function Icon({ name, size = 20, color = "#f4f4ef" }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
}
