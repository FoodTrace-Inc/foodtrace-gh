import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  active?: boolean;
}

/** Cyan corner-bracket viewfinder + amber scan line overlay for the live camera screen. */
export function ScannerFrame({ active = true }: Props) {
  return (
    <View pointerEvents="none" style={styles.viewfinder}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
      {active ? <View style={styles.scanLine} /> : null}
    </View>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  viewfinder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#18a2a6" },
  cornerTL: { top: "22%", left: "12%", borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: "22%", right: "12%", borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: "22%", left: "12%", borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: "22%", right: "12%", borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanLine: { position: "absolute", left: "14%", right: "14%", height: 2, backgroundColor: "#edb54c", top: "50%" },
});
