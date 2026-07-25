import React from "react";
import { Image, Text, View } from "react-native";

/** Same leaf/shield mark used on web (assets/foodtrace-logo.png), mark + wordmark lockup. */
export function Logo({ size = 22, color = "#77c7a2", fontSize = 16 }: { size?: number; color?: string; fontSize?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image
        source={require("../../assets/foodtrace-logo.png")}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="contain"
      />
      <Text style={{ color, fontWeight: "800", fontSize, letterSpacing: 0.5 }}>
        FoodTrace <Text style={{ opacity: 0.65 }}>GH</Text>
      </Text>
    </View>
  );
}
