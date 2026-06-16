/**
 * ScanHistoryScreen.tsx
 *
 * Displays the consumer's local scan history, persisted to
 * expo-sqlite/kv-store by App.tsx (up to 25 entries).
 *
 * Features:
 *   - Shows the 25 most recent scans, newest first.
 *   - Colour-coded status badge for each entry.
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

/** Returns the badge background colour for a given scan status. */
function badgeColor(status: ProductScanResult["status"]): string {
  switch (status) {
    case "safe":
      return "#c4f1db";
    case "caution":
      return "#f6e7b5";
    case "recalled":
      return "#f7c2c2";
    default:
      return "#d1d5db";
  }
}

/** Returns the badge text colour for a given scan status. */
function badgeTextColor(status: ProductScanResult["status"]): string {
  return "#12392d";
}

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
  /** ID of the currently expanded entry (null = none). */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  /** Toggle inline expansion of an entry's details. */
  function toggleEntry(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function handleClear() {
    if (!confirmClear) {
      // Ask for confirmation before wiping.
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    onClear();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Scan history</Text>
          <Text style={styles.title}>
            {history.length
              ? `${history.length} saved scan${history.length !== 1 ? "s" : ""}`
              : "No scans yet"}
          </Text>
        </View>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      {/* ── Empty state ── */}
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Nothing scanned yet</Text>
          <Text style={styles.emptyBody}>
            Scan a food or drug QR code and your results will appear here for
            offline review.
          </Text>
          <Pressable style={styles.primaryButton} onPress={onBack}>
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
                style={styles.entryCard}
                onPress={() => toggleEntry(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.title}, ${entry.status}, ${relativeTime(entry.createdAt)}`}
              >
                {/* Row: badge + title + timestamp */}
                <View style={styles.entryRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: badgeColor(entry.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: badgeTextColor(entry.status) },
                      ]}
                    >
                      {entry.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.entryMeta}>
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.entryCode}>
                      {entry.kind === "drug" ? "💊" : "🌿"}{" "}
                      {entry.codeString}
                    </Text>
                  </View>

                  <Text style={styles.entryTime}>
                    {relativeTime(entry.createdAt)}
                  </Text>
                </View>

                {/* Expanded detail panel */}
                {isExpanded ? (
                  <View style={styles.entryDetail}>
                    <Text style={styles.detailLabel}>Summary</Text>
                    <Text style={styles.detailText}>{entry.summary}</Text>

                    {entry.recommendedAction ? (
                      <>
                        <Text style={[styles.detailLabel, { marginTop: 10 }]}>
                          Recommended action
                        </Text>
                        <Text style={styles.detailText}>
                          {entry.recommendedAction}
                        </Text>
                      </>
                    ) : null}

                    <Text style={styles.detailTimestamp}>
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
              confirmClear && styles.clearButtonDanger,
            ]}
            onPress={handleClear}
          >
            <Text
              style={[
                styles.clearButtonText,
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
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: "#05080b",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  kicker: {
    color: "#93b9ac",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: "#f4f4ef",
    fontSize: 22,
    fontWeight: "700",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#182028",
    borderRadius: 999,
  },
  backButtonText: {
    color: "#d5ddd9",
    fontWeight: "600",
  },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#f4f4ef",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    color: "#748089",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: "#77c7a2",
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
    backgroundColor: "#10161b",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
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
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  entryMeta: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    color: "#f4f4ef",
    fontWeight: "600",
    fontSize: 14,
  },
  entryCode: {
    color: "#748089",
    fontSize: 12,
  },
  entryTime: {
    color: "#748089",
    fontSize: 12,
    flexShrink: 0,
  },
  entryDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    gap: 4,
  },
  detailLabel: {
    color: "#93b9ac",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailText: {
    color: "#d0dbd7",
    lineHeight: 20,
  },
  detailTimestamp: {
    marginTop: 10,
    color: "#748089",
    fontSize: 12,
  },

  // ── Clear controls ──
  clearButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 4,
  },
  clearButtonDanger: {
    borderColor: "#f7c2c2",
    backgroundColor: "rgba(127,0,0,0.15)",
  },
  clearButtonText: {
    color: "#748089",
    fontWeight: "600",
  },
  clearButtonDangerText: {
    color: "#f7c2c2",
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#748089",
    fontSize: 13,
  },
});
