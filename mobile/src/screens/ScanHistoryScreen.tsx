/**
 * ScanHistoryScreen.tsx
 *
 * Displays the consumer's local scan history, persisted to
 * expo-sqlite/kv-store by App.tsx (up to 25 entries). ProofLoop styling.
 *
 * Features:
 *   - Shows the 25 most recent scans, newest first.
 *   - Colour-coded status badge for each entry (SAFE / CAUTION / RECALLED / NOT_FOUND).
 *   - Tap an entry to view the summary inline.
 *   - "Clear history" button to wipe all stored entries.
 *   - Empty-state illustration when there are no scans yet.
 */

import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ProductScanResult } from "@foodtrace/shared";
import { Icon, type IconName } from "../components/Icon";
import { usePalette } from "../theme/ThemeContext";
import { ProofStatusBadge, statusFor } from "../components/ProofStatusBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Matches the HistoryEntry shape used in App.tsx. */
export type HistoryEntry = {
  id: string;
  kind: "food" | "drug";
  codeString: string;
  status: ProductScanResult["status"];
  title: string;
  summary: string;
  recommendedAction?: string;
  createdAt: string;
};

type ScanHistoryScreenProps = {
  /** Array of history entries managed and persisted by App.tsx. */
  history: HistoryEntry[];
  /** Called when the user requests to clear all history. */
  onClear: () => void;
  /** Navigate back to the scanner. */
  onBack: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a short, human-friendly relative timestamp. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScanHistoryScreen({
  history,
  onClear,
  onBack,
}: ScanHistoryScreenProps) {
  const p = usePalette();
  /** ID of the currently expanded entry (null = none). */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  /** Toggle inline expansion of an entry's details. */
  function toggleEntry(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    onClear();
  }

  return (
    <ScrollView style={{ backgroundColor: p.pageBg }} contentContainerStyle={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: p.signalCyan }]}>Scan history</Text>
          <Text style={[styles.title, { color: p.textPrimary }]}>
            {history.length
              ? `${history.length} saved scan${history.length !== 1 ? "s" : ""}`
              : "No scans yet"}
          </Text>
        </View>
        <Pressable style={[styles.backButton, { backgroundColor: p.cardBg }]} onPress={onBack}>
          <Icon name="chevron-back" size={16} color={p.textPrimary} />
          <Text style={[styles.backButtonText, { color: p.textPrimary }]}>Back</Text>
        </Pressable>
      </View>

      {/* ── Empty state ── */}
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: p.cardBg }]}>
            <Icon name="search-outline" size={28} color={p.signalCyan} />
          </View>
          <Text style={[styles.emptyTitle, { color: p.textPrimary }]}>Nothing scanned yet</Text>
          <Text style={[styles.emptyBody, { color: p.textSecondary }]}>
            Scan a food or drug QR code and your results will appear here for
            offline review.
          </Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: p.signalCyan }]} onPress={onBack}>
            <Text style={styles.primaryButtonText}>Start scanning</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* ── Entry list ── */}
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <Pressable
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: p.cardBg }]}
                onPress={() => toggleEntry(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.title}, ${entry.status}, ${relativeTime(entry.createdAt)}`}
              >
                {/* Row: badge + title + timestamp */}
                <View style={styles.entryRow}>
                  <ProofStatusBadge status={statusFor(entry.status)} />

                  <View style={styles.entryMeta}>
                    <Text style={[styles.entryTitle, { color: p.textPrimary }]} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name={entry.kind === "drug" ? "medkit-outline" : "leaf-outline"} size={11} color={p.textSecondary} />
                      <Text style={[styles.entryCode, { color: p.textSecondary }]}>{entry.codeString}</Text>
                    </View>
                  </View>

                  <Text style={[styles.entryTime, { color: p.textSecondary }]}>
                    {relativeTime(entry.createdAt)}
                  </Text>
                </View>

                {/* Expanded detail panel */}
                {isExpanded ? (
                  <View style={[styles.entryDetail, { borderTopColor: p.border }]}>
                    <Text style={[styles.detailLabel, { color: p.signalCyan }]}>Summary</Text>
                    <Text style={[styles.detailText, { color: p.textPrimary }]}>{entry.summary}</Text>

                    {entry.recommendedAction ? (
                      <>
                        <Text style={[styles.detailLabel, { color: p.signalCyan, marginTop: 10 }]}>
                          Recommended action
                        </Text>
                        <Text style={[styles.detailText, { color: p.textPrimary }]}>
                          {entry.recommendedAction}
                        </Text>
                      </>
                    ) : null}

                    <Text style={[styles.detailTimestamp, { color: p.textSecondary }]}>
                      Scanned:{" "}
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {/* ── Clear history button ── */}
          <Pressable
            style={[
              styles.clearButton,
              { borderColor: p.border },
              confirmClear && styles.clearButtonDanger,
            ]}
            onPress={handleClear}
          >
            <Text
              style={[
                styles.clearButtonText,
                { color: p.textSecondary },
                confirmClear && styles.clearButtonDangerText,
              ]}
            >
              {confirmClear ? "Tap again to confirm clear" : "Clear history"}
            </Text>
          </Pressable>

          {confirmClear ? (
            <Pressable
              style={styles.cancelButton}
              onPress={() => setConfirmClear(false)}
            >
              <Text style={[styles.cancelButtonText, { color: p.textSecondary }]}>Cancel</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  backButtonText: {
    fontWeight: "600",
  },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#062014",
    fontWeight: "700",
  },

  // ── Entry cards ──
  entryCard: {
    borderRadius: 18,
    padding: 14,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  entryMeta: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  entryCode: {
    fontSize: 12,
  },
  entryTime: {
    fontSize: 12,
    flexShrink: 0,
  },
  entryDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailText: {
    lineHeight: 20,
  },
  detailTimestamp: {
    marginTop: 10,
    fontSize: 12,
  },

  // ── Clear controls ──
  clearButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  clearButtonDanger: {
    borderColor: "#e0475c",
    backgroundColor: "rgba(224,71,92,0.1)",
  },
  clearButtonText: {
    fontWeight: "600",
  },
  clearButtonDangerText: {
    color: "#e0475c",
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 13,
  },
});
