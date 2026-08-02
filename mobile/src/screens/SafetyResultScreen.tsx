/**
 * SafetyResultScreen.tsx
 *
 * Displays the full-screen safety result after a QR scan.
 * Background colour reflects the safety status:
 *   safe     → #1B5E20  (deep green)
 *   caution  → #E65100  (deep orange)
 *   recalled → #7F0000  (deep red)
 *
 * Audio summary is played AUTOMATICALLY via expo-speech (with a Google TTS
 * fallback through the backend) as soon as the screen mounts.
 */

import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import type { DrugScanResult, ProductScanResult, SpeechSummaryResponse } from "@foodtrace/shared";
import { SafetyRing, statusToRingStatus } from "../components/SafetyRing";
import { Icon } from "../components/Icon";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";

// ─── Types ───────────────────────────────────────────────────────────────────

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response."
        : `The server returned ${response.status} ${response.statusText || "without details"}. Check the API URL and backend logs.`
    );
  }

  try {
    const data = JSON.parse(text) as T & {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
      title?: unknown;
    };

    if (!response.ok) {
      const message = [data.error, data.message, data.detail, data.title].find((value) => typeof value === "string");
      throw new Error(typeof message === "string" ? message : `Request failed with status ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Unexpected")) {
      throw error;
    }
    throw new Error(`The server returned a response the app could not read. Status: ${response.status}.`);
  }
}

type ScanResult = ProductScanResult | DrugScanResult;

type SafetyResultScreenProps = {
  /** The decoded scan result returned by the backend. */
  result: ScanResult;
  /** Active language for TTS: "en" or "tw" (Twi). */
  scanLanguage: "en" | "tw";
  /** Base URL of the backend API, e.g. "http://192.168.x.x:3000/api". */
  apiBase: string;
  /** Navigate back to the scanner. */
  onBack: () => void;
  /** Navigate to the scan history screen. */
  onViewHistory: () => void;
  /** Navigate to the consumer report screen. */
  onReport: () => void;
  /** Navigate to the AI helper tab with the product pre-loaded as context. */
  onAskAI?: (prefill: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the full-screen background hex for each scan status. */
function backgroundForStatus(status: ProductScanResult["status"]): string {
  switch (status) {
    case "safe":
      return "#1B5E20";
    case "caution":
      return "#E65100";
    case "recalled":
      return "#7F0000";
    default:
      return "#1a2228";
  }
}

/**
 * Short, clear Twi phrases per status - used for both the spoken summary
 * and the on-screen Twi text. Kept deliberately brief: the backend's
 * paragraph-length audioSummaryTwi was accurate but too long for on-device
 * TTS (no real Twi voice on most Android phones) to render clearly.
 */
const TWI_STATUS_TEXT: Record<string, string> = {
  safe: "Adeɛ yi ho tumi — wubɛtɔ no",
  caution: "Hwɛ adeɛ yi yiye ansa wobɛtɔ",
  recalled: "Mfa adeɛ yi mmɛtɔ — wɔde asan",
};
const ENGLISH_STATUS_TEXT: Record<string, string> = {
  safe: "This product is safe to buy",
  caution: "Check before buying",
  recalled: "Do not buy — recalled",
};

/**
 * Builds the spoken summary sentence. Twi uses the short status phrase
 * above (clearer on-device TTS than a long sentence); English prefers the
 * backend-crafted `audioSummary` field, falling back to title + summary +
 * recommendedAction.
 */
function buildSpeechText(result: ScanResult, language: "en" | "tw"): string {
  if (language === "tw") return TWI_STATUS_TEXT[result.status] ?? TWI_STATUS_TEXT.caution;
  if (result.audioSummary) return result.audioSummary;
  const parts = [result.title, result.summary, result.recommendedAction].filter(Boolean);
  return parts.join(" ").trim();
}

/** Builds a contextual question for the AI assistant about this scan result. */
function buildAiPrefill(result: ScanResult): string {
  const name = "drugName" in result && result.drugName ? result.drugName : (result as ProductScanResult).productName ?? result.title;
  const batch = result.batchNumber ? ` (batch ${result.batchNumber})` : "";
  return `I just scanned a product called "${name}"${batch} and got a ${result.status.toUpperCase()} result. ${result.summary} What should I do?`;
}

/** Narrows a result to check whether it carries drug-specific fields. */
function isDrugResult(result: ScanResult): result is DrugScanResult {
  return "drugName" in result;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SOUND_BY_STATUS: Record<string, ReturnType<typeof require>> = {
  safe: require("../../assets/sounds/chime_safe.wav"),
  caution: require("../../assets/sounds/alert_caution.wav"),
  recalled: require("../../assets/sounds/alarm_recalled.wav"),
};

export function SafetyResultScreen({
  result,
  scanLanguage,
  apiBase,
  onBack,
  onViewHistory,
  onReport,
  onAskAI,
}: SafetyResultScreenProps) {
  const bgColor = backgroundForStatus(result.status);
  const status = result.status;

  // ── Entrance + status-specific animations (all finish well under 1s) ──────
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const screenSlideX = useRef(new Animated.Value(status === "caution" ? 60 : 0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 80, delay: 150, useNativeDriver: true }),
    ];

    if (status === "caution") {
      animations.push(Animated.timing(screenSlideX, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
      animations.push(
        Animated.sequence([
          Animated.delay(320),
          Animated.timing(iconScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(iconScale, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(iconScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(iconScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ])
      );
    }

    if (status === "recalled") {
      animations.push(
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.55, duration: 90, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ])
      );
      animations.push(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(shakeX, { toValue: -10, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 10, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -10, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 10, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
        ])
      );
    }

    Animated.parallel(animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play a short status sound once, alongside the spoken summary ─────────
  useEffect(() => {
    let soundRef: Audio.Sound | null = null;
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(SOUND_BY_STATUS[status] ?? SOUND_BY_STATUS.safe, { shouldPlay: true, volume: 0.8 });
        soundRef = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if ("didJustFinish" in s && s.didJustFinish) void sound.unloadAsync();
        });
      } catch {
        // Sound effects are decorative - never block the result screen on failure.
      }
    })();
    return () => { void soundRef?.unloadAsync(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-play audio on mount ──────────────────────────────────────────────

  /**
   * Attempt to play the spoken summary through the backend Google TTS
   * endpoint. Falls back to the on-device expo-speech engine when the
   * network call fails or the backend is unavailable.
   */
  const playGoogleTTS = useCallback(
    async (text: string, rate: number): Promise<void> => {
      // "ak" (Akan) is the correct language code for Twi - "tw" gives worse
      // pronunciation on the Google TTS voices that support it at all.
      const response = await fetchWithTimeout(`${apiBase}/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: scanLanguage === "tw" ? "ak" : scanLanguage, speakingRate: rate }),
      });

      const data = (await readJsonResponse(response)) as SpeechSummaryResponse & {
        error?: unknown;
      };

      if (!response.ok || !data.audioBase64) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Google TTS unavailable"
        );
      }

      // Allow audio to play even when the iOS silent switch is on.
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:${data.mimeType};base64,${data.audioBase64}` },
        { shouldPlay: true }
      );

      // Unload the sound object once playback finishes to free memory.
      sound.setOnPlaybackStatusUpdate((status) => {
        if ("didJustFinish" in status && status.didJustFinish) {
          void sound.unloadAsync();
        }
      });
    },
    [apiBase, scanLanguage]
  );

  /**
   * Device TTS fallback via expo-speech - this is what actually plays today,
   * since Google Cloud TTS is not configured on this deployment (the backend
   * call always fails over to here). "ak" (Akan) is the correct language
   * code for Twi on Android's on-device engines; "tw" is often unrecognised
   * and silently mispronounced. Twi defaults to a slightly slower rate than
   * English since most phones have no real Twi voice to begin with.
   */
  const speakFallback = useCallback(
    (text: string, rate: number): void => {
      Speech.stop();
      Speech.speak(text, {
        language: scanLanguage === "tw" ? "ak" : "en-US",
        rate,
      });
    },
    [scanLanguage]
  );

  /** Entry-point: try Google TTS, fall back to device TTS on any error. rate: 1.0 normal, 0.7 slow. */
  const playSummary = useCallback(async (rate?: number): Promise<void> => {
    const text = buildSpeechText(result, scanLanguage);
    if (!text) return;
    const effectiveRate = rate ?? (scanLanguage === "tw" ? 0.85 : 0.95);

    try {
      await playGoogleTTS(text, effectiveRate);
    } catch {
      speakFallback(text, effectiveRate);
    }
  }, [result, scanLanguage, playGoogleTTS, speakFallback]);

  // Trigger audio automatically when the screen mounts.
  useEffect(() => {
    void playSummary();

    // Stop any in-progress speech when the component unmounts.
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {status === "recalled" ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#ff1744", opacity: flashOpacity, zIndex: 10 }]} />
      ) : null}
      <Animated.ScrollView
        style={{ backgroundColor: bgColor, transform: [{ translateX: screenSlideX }] }}
        contentContainerStyle={[styles.container, { backgroundColor: bgColor }]}
      >
        {/* ── Animated safety ring ── */}
        <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }, { translateX: shakeX }], marginBottom: 6 }}>
          <SafetyRing status={statusToRingStatus(result.status)} />
        </Animated.View>

        {/* ── Status badge ── */}
        <Animated.View style={{ transform: [{ scale: badgeScale }], alignSelf: "center", marginBottom: 10 }}>
          <View style={[styles.statusBadge, { borderColor: "rgba(255,255,255,0.4)" }]}>
            <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
          </View>
        </Animated.View>

        {status === "recalled" ? <Text style={styles.doNotBuy}>DO NOT BUY</Text> : null}

        {/* ── Product title & summary ── */}
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.summary}>{result.summary}</Text>

        {/* ── Twi translation, shown larger than English since it needs more room to read clearly ── */}
        {scanLanguage === "tw" ? (
          <View style={styles.twiBlock}>
            <Text style={styles.twiEnglishRef}>{ENGLISH_STATUS_TEXT[status]}</Text>
            <Text style={styles.twiText}>{TWI_STATUS_TEXT[status]}</Text>
          </View>
        ) : null}

      {/* ── Product photo ── */}
      {result.imageUrl ? (
        <Image source={{ uri: result.imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : null}

      {/* ── Detail rows ── */}
      <View style={styles.detailCard}>
        {isDrugResult(result) && result.drugName ? (
          <DetailRow label="Drug" value={result.drugName} />
        ) : null}

        <DetailRow label="Batch" value={result.batchNumber ?? "N/A"} />
        <DetailRow label="Manufacturer" value={result.manufacturerName ?? "N/A"} />
        <DetailRow label="Expiry" value={result.expiryDate ?? "N/A"} />

        {result.recommendedAction ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>Recommended action</Text>
            <Text style={styles.actionText}>{result.recommendedAction}</Text>
          </View>
        ) : null}

        <Text style={styles.disclaimerText}>
          Product safety information is sourced from the Ghana Food and Drugs Authority (FDA) public
          register. FoodTrace GH is not affiliated with or endorsed by the Ghana FDA. Always consult a
          qualified health professional before making decisions about medicines.
        </Text>
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Replay the audio summary on demand */}
        {scanLanguage === "tw" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable style={[styles.secondaryButton, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]} onPress={() => void playSummary()}>
              <Icon name="volume-high-outline" size={16} color={styles.secondaryButtonText.color} />
              <Text style={styles.secondaryButtonText}>Play again</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]} onPress={() => void playSummary(0.7)}>
              <Icon name="hourglass-outline" size={16} color={styles.secondaryButtonText.color} />
              <Text style={styles.secondaryButtonText}>Play slowly</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.secondaryButton, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]} onPress={() => void playSummary()}>
            <Icon name="volume-high-outline" size={16} color={styles.secondaryButtonText.color} />
            <Text style={styles.secondaryButtonText}>Play audio again</Text>
          </Pressable>
        )}

        {onAskAI ? (
          <Pressable style={styles.ghostButton} onPress={() => onAskAI(buildAiPrefill(result))}>
            <Text style={styles.ghostButtonText}>Ask AI about this product</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.ghostButton} onPress={onReport}>
          <Text style={styles.ghostButtonText}>Report a concern</Text>
        </Pressable>

        <Pressable style={styles.ghostButton} onPress={onViewHistory}>
          <Text style={styles.ghostButtonText}>View scan history</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Scan another</Text>
        </Pressable>
      </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    gap: 16,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  doNotBuy: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: -6,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  summary: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  twiBlock: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 14,
    marginTop: -4,
    marginBottom: 16,
    alignItems: "center",
  },
  twiEnglishRef: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  twiText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 27,
    textAlign: "center",
  },
  productImage: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  detailCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 8,
  },
  detailLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  actionRow: {
    paddingTop: 4,
  },
  actionLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  disclaimerText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  controls: {
    marginTop: 8,
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  ghostButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ghostButtonText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  backButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontSize: 15,
  },
});
