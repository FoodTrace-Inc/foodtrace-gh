/**
 * SplashIntro.tsx
 *
 * Animated launch intro for FoodTrace GH. Plays every time the app opens:
 * a glowing ring expands, the shield/check logo rotates-and-settles into place
 * with a spring, then the wordmark + tagline fade up — before the whole screen
 * fades out to reveal the app.
 *
 * Pure React Native Animated (native driver), dark-green theme.
 */

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export function SplashIntro({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(14)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1) logo rotates + scales in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 4.5, tension: 70, useNativeDriver: true }),
        Animated.timing(logoSpin, { toValue: 1, duration: 750, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }),
      ]),
      // 2) ring pulses out + wordmark rises
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.9, duration: 160, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 620, useNativeDriver: true }),
        ]),
        Animated.timing(ringScale, { toValue: 1.7, duration: 780, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(ring2Opacity, { toValue: 0.7, duration: 160, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 620, useNativeDriver: true }),
        ]),
        Animated.timing(ring2Scale, { toValue: 2.1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textShift, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      // 3) hold, then fade the whole intro out
      Animated.delay(450),
      Animated.timing(containerOpacity, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [logoScale, logoSpin, logoOpacity, ringScale, ringOpacity, ring2Scale, ring2Opacity, textOpacity, textShift, containerOpacity, onFinish]);

  const spin = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ["-140deg", "0deg"] });

  return (
    <Animated.View style={[styles.root, { opacity: containerOpacity }]}>
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: spin }] }]}>
          <Text style={styles.check}>✓</Text>
        </Animated.View>
      </View>

      <Animated.View style={{ alignItems: "center", opacity: textOpacity, transform: [{ translateY: textShift }] }}>
        <Text style={styles.title}>FOODTRACE GH</Text>
        <Text style={styles.tag}>Scan. Verify. Stay safe.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const RING = 150;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#05080b",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    zIndex: 100,
  },
  stage: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: "#77c7a2",
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#77c7a2",
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: "#05080b", fontSize: 58, fontWeight: "900", marginTop: -4 },
  title: { color: "#eafff5", fontSize: 26, fontWeight: "800", letterSpacing: 3 },
  tag: { color: "#77c7a2", fontSize: 13, marginTop: 8, letterSpacing: 1 },
});
