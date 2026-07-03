/**
 * NotificationsModal.tsx
 *
 * In-app notification center. Slides up over any screen and lists the user's
 * notifications (post approved, new comment, recall, pending review), newest
 * first, with unread ones highlighted.
 */

import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

function accentFor(type: string): string {
  switch (type) {
    case "post_approved": return "#77c7a2";
    case "post_recalled": return "#F09595";
    case "comment": return "#85B7EB";
    case "pending_review": return "#EF9F27";
    default: return "#7d8a84";
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsModal({
  visible,
  items,
  onClose,
}: {
  visible: boolean;
  items: AppNotification[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Notifications</Text>
            <Pressable onPress={onClose} hitSlop={10}><Text style={s.done}>Done</Text></Pressable>
          </View>

          {items.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.bell}>🔔</Text>
              <Text style={s.emptyText}>No notifications yet.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {items.map((n) => (
                <View key={n.id} style={[s.item, !n.isRead && s.unread]}>
                  <View style={[s.dot, { backgroundColor: accentFor(n.type) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle}>{n.title}</Text>
                    {n.body ? <Text style={s.itemBody}>{n.body}</Text> : null}
                    <Text style={s.time}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0b120e", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "78%", paddingTop: 8, borderTopWidth: 0.5, borderColor: "rgba(119,199,162,0.2)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "rgba(119,199,162,0.14)" },
  title: { color: "#e8f0ec", fontSize: 17, fontWeight: "700" },
  done: { color: "#77c7a2", fontSize: 15, fontWeight: "600" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  bell: { fontSize: 40 },
  emptyText: { color: "#7d8a84", fontSize: 14 },
  item: { flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "rgba(119,199,162,0.08)" },
  unread: { backgroundColor: "rgba(119,199,162,0.06)" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  itemTitle: { color: "#e8f0ec", fontSize: 14, fontWeight: "600" },
  itemBody: { color: "#cdd8d2", fontSize: 12, lineHeight: 17, marginTop: 2 },
  time: { color: "#7d8a84", fontSize: 11, marginTop: 4 },
});
