/**
 * MarketplaceFeedScreen.tsx
 *
 * The FoodTrace GH marketplace social feed — ProofLoop styling: dark screen,
 * gradient "proof-backed goods" cards, cyan verification pills. Sellers
 * (manufacturer / farmer / pharmacist) post products; everyone browses,
 * likes, saves, comments, and taps "Scan to verify" to open the live safety
 * result for a post's QR code.
 *
 * Every post carries a safety badge (FDA Approved / EPA Cleared / Recalled)
 * that the backend resolves from the real scan/recall system — it cannot be
 * faked by the seller.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "../components/Icon";

type MarketplacePost = {
  id: string;
  domain: string;
  title: string;
  caption: string;
  location: string | null;
  imageUrl: string | null;
  hashtags: string[];
  qrCodeString: string | null;
  safetyStatus: string;
  safetyLabel: string;
  safetySource: string;
  status: string; // active | pending | flagged | recalled | hidden
  sellerName: string;
  sellerRole: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
};

type Comment = { id: string; body: string; authorName: string; authorRole: string };

type Props = {
  apiBase: string;
  token: string;
  currentUserRole: string;
  onVerifyCode: (code: string, domain: string) => void;
  onCompose: () => void;
};

const FILTERS: { key: string; label: string; domain: string | null }[] = [
  { key: "all", label: "All Products", domain: null },
  { key: "food", label: "Food", domain: "food" },
  { key: "drug", label: "Drugs", domain: "drug" },
  { key: "farm", label: "Farms", domain: "farm" },
];

const SELLER_ROLES = ["manufacturer", "farmer", "pharmacist"];

// Domain-colored gradient bands for posts without a real photo — mirrors
// the web marketplace's vibrant per-domain card treatment.
const DOMAIN_GRADIENT: Record<string, [string, string]> = {
  food: ["#edb54c", "#18a2a6"],
  drug: ["#1b6d8f", "#18a2a6"],
  farm: ["#c9d95f", "#18a2a6"],
};

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "FT";
}

function badgeColors(status: string): { bg: string; fg: string } {
  if (status === "recalled") return { bg: "#e0475c", fg: "#3a0d12" };
  if (status === "unverified") return { bg: "#edb54c", fg: "#4a3400" };
  if (status === "epa_cleared") return { bg: "#1b6d8f", fg: "#eaf6fa" };
  return { bg: "#fff9ec", fg: "#0f6f6f" }; // fda_approved / default — cream pill, cyan text
}

export function MarketplaceFeedScreen({ apiBase, token, currentUserRole, onVerifyCode, onCompose }: Props) {
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const isSeller = SELLER_ROLES.includes(currentUserRole);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const domain = FILTERS.find((f) => f.key === filter)?.domain;
      const url = `${apiBase}/marketplace/posts${domain ? `?domain=${domain}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status >= 500 ? "Server is waking up. Pull to refresh in a moment." : "Could not load the feed.");
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, filter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  function patchPost(id: string, changes: Partial<MarketplacePost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  async function toggleLike(post: MarketplacePost) {
    patchPost(post.id, {
      likedByViewer: !post.likedByViewer,
      likeCount: post.likeCount + (post.likedByViewer ? -1 : 1),
    });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/like`, { method: "POST", headers: authHeaders });
      if (!res.ok) { void loadFeed(); return; }
      const data = await res.json();
      if (typeof data.likeCount === "number") patchPost(post.id, { likedByViewer: data.liked, likeCount: data.likeCount });
    } catch {
      void loadFeed();
    }
  }

  async function toggleSave(post: MarketplacePost) {
    patchPost(post.id, { savedByViewer: !post.savedByViewer });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/save`, { method: "POST", headers: authHeaders });
      if (!res.ok) { void loadFeed(); return; }
      const data = await res.json();
      if (typeof data.saved === "boolean") patchPost(post.id, { savedByViewer: data.saved });
    } catch {
      void loadFeed();
    }
  }

  async function toggleComments(post: MarketplacePost) {
    if (openComments[post.id]) {
      setOpenComments((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOpenComments((prev) => ({ ...prev, [post.id]: data.comments ?? [] }));
    } catch {
      setOpenComments((prev) => ({ ...prev, [post.id]: [] }));
    }
  }

  async function sharePost(post: MarketplacePost) {
    const lines = [
      `${post.title} — ${post.safetyLabel} on FoodTrace GH`,
      post.caption || "",
      post.qrCodeString ? `Verify this product, code: ${post.qrCodeString}` : "",
      "Scan before you buy. Stay safe with FoodTrace GH.",
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n") });
    } catch { /* user dismissed */ }
  }

  async function approve(post: MarketplacePost) {
    patchPost(post.id, { status: "active" });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/approve`, { method: "PATCH", headers: authHeaders });
      if (!res.ok) void loadFeed();
    } catch {
      void loadFeed();
    }
  }

  async function submitComment(post: MarketplacePost) {
    const body = (commentDraft[post.id] || "").trim();
    if (!body) return;
    setCommentDraft((prev) => ({ ...prev, [post.id]: "" }));
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/comments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ body }),
      });
      const data = res.ok ? await res.json() : null;
      if (!data?.comment) throw new Error("comment failed");
      setOpenComments((prev) => ({ ...prev, [post.id]: [...(prev[post.id] ?? []), data.comment] }));
      patchPost(post.id, { commentCount: post.commentCount + 1 });
    } catch {
      setCommentDraft((prev) => ({ ...prev, [post.id]: body }));
    }
  }

  function renderPost({ item: post }: { item: MarketplacePost }) {
    const pending = post.status === "pending";
    const badge = pending ? { bg: "#edb54c", fg: "#4a3400" } : badgeColors(post.safetyStatus);
    const badgeLabel = pending ? "Pending approval" : post.safetyLabel;
    const comments = openComments[post.id];
    const gradient = DOMAIN_GRADIENT[post.domain] ?? DOMAIN_GRADIENT.food;

    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials(post.sellerName)}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.sellerName} numberOfLines={1}>{post.sellerName}</Text>
              <View style={s.roleChip}><Text style={s.roleChipText}>{String(post.sellerRole).toUpperCase()}</Text></View>
            </View>
            <Text style={s.metaText}>{post.location ? `${post.location} · ` : ""}{post.domain}</Text>
          </View>
        </View>

        <View style={s.imageArea}>
          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={s.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeText, { color: badge.fg }]}>{badgeLabel}</Text>
          </View>
        </View>

        {post.title ? <Text style={s.title}>{post.title}</Text> : null}
        {post.caption ? <Text style={s.caption}>{post.caption}</Text> : null}
        {post.hashtags?.length ? (
          <Text style={s.hashtags}>{post.hashtags.map((h) => `#${h}`).join("  ")}</Text>
        ) : null}

        {post.qrCodeString ? (
          <View style={s.qrStrip}>
            <View style={s.qrBox}><Icon name="qr-code-outline" size={20} color="#111417" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.qrCode} numberOfLines={1}>{post.qrCodeString}</Text>
              <Text style={s.qrHint}>Tap to check live safety status</Text>
            </View>
            <Pressable style={s.verifyBtn} onPress={() => onVerifyCode(post.qrCodeString!, post.domain)}>
              <Text style={s.verifyBtnText}>Scan to verify</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.actions}>
          <Pressable style={s.actionBtn} onPress={() => void toggleLike(post)}>
            <Icon name={post.likedByViewer ? "heart" : "heart-outline"} size={18} color={post.likedByViewer ? "#d4537e" : "#a39d94"} />
            <Text style={s.actionText}>{post.likeCount}</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => void toggleComments(post)}>
            <Icon name="chatbubble-outline" size={17} color="#a39d94" />
            <Text style={s.actionText}>{post.commentCount}</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => void sharePost(post)}>
            <Icon name="share-social-outline" size={18} color="#18a2a6" />
            <Text style={[s.actionText, { color: "#18a2a6" }]}>Share</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => void toggleSave(post)}>
            <Icon name={post.savedByViewer ? "bookmark" : "bookmark-outline"} size={17} color={post.savedByViewer ? "#edb54c" : "#a39d94"} />
            <Text style={[s.actionText, post.savedByViewer && { color: "#edb54c" }]}>Save</Text>
          </Pressable>
        </View>

        {pending && currentUserRole === "regulator" ? (
          <Pressable style={s.approveBtn} onPress={() => void approve(post)}>
            <Icon name="checkmark-circle-outline" size={16} color="#18a2a6" />
            <Text style={s.approveBtnText}>Approve this post</Text>
          </Pressable>
        ) : pending ? (
          <Text style={s.pendingNote}>Awaiting regulator approval before it goes public.</Text>
        ) : null}

        {comments ? (
          <View style={s.comments}>
            {comments.length === 0 ? (
              <Text style={s.noComments}>No comments yet — be the first.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={s.commentRow}>
                  <View style={s.commentAvatar}><Text style={s.commentAvatarText}>{initials(c.authorName)}</Text></View>
                  <Text style={s.commentText}><Text style={s.commentAuthor}>{c.authorName} </Text>{c.body}</Text>
                </View>
              ))
            )}
            <View style={s.commentInputRow}>
              <TextInput
                style={s.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#a39d94"
                value={commentDraft[post.id] || ""}
                onChangeText={(t) => setCommentDraft((prev) => ({ ...prev, [post.id]: t }))}
              />
              <Pressable onPress={() => void submitComment(post)}><Text style={s.sendText}>Send</Text></Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.headerTitle}>MARKET</Text>
        {isSeller ? (
          <Pressable style={s.composeFab} onPress={onCompose}>
            <Icon name="add" size={20} color="#062014" />
          </Pressable>
        ) : null}
      </View>
      <Text style={s.headline}>Proof-backed goods</Text>

      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} style={[s.filter, filter === f.key && s.filterOn]} onPress={() => setFilter(f.key)}>
            <Text style={[s.filterText, filter === f.key && s.filterTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading && posts.length === 0 ? (
        <View style={s.center}><ActivityIndicator color="#18a2a6" /><Text style={s.centerText}>Loading feed…</Text></View>
      ) : error && posts.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => void loadFeed()}><Text style={s.retryText}>Try again</Text></Pressable>
        </View>
      ) : posts.length === 0 ? (
        <View style={s.center}><Text style={s.centerText}>No products posted yet.</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshing={loading}
          onRefresh={() => void loadFeed()}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111417" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16 },
  headerTitle: { color: "#fff9ec", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  composeFab: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#18a2a6", alignItems: "center", justifyContent: "center" },
  headline: { color: "#fff9ec", fontSize: 26, fontWeight: "800", paddingHorizontal: 16, marginTop: 6, marginBottom: 12 },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 4, flexWrap: "wrap" },
  filter: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: "#1c2024" },
  filterOn: { backgroundColor: "#18a2a6" },
  filterText: { color: "#a39d94", fontSize: 12, fontWeight: "600" },
  filterTextOn: { color: "#062014", fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  centerText: { color: "#a39d94", fontSize: 13 },
  errorText: { color: "#e0475c", fontSize: 13, textAlign: "center" },
  retryBtn: { backgroundColor: "#18a2a6", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: "#062014", fontWeight: "700" },

  card: { backgroundColor: "#181716", borderRadius: 20, marginTop: 12, marginHorizontal: 4, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#18a2a6", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sellerName: { color: "#fff9ec", fontSize: 14, fontWeight: "700", flexShrink: 1 },
  roleChip: { backgroundColor: "rgba(24,162,166,0.18)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleChipText: { color: "#18a2a6", fontSize: 9, fontWeight: "700" },
  metaText: { color: "#a39d94", fontSize: 11, marginTop: 1 },

  imageArea: { height: 150, backgroundColor: "#0d0f11" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  badge: { position: "absolute", bottom: 10, right: 10, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  title: { color: "#fff9ec", fontSize: 15, fontWeight: "700", paddingHorizontal: 14, paddingTop: 12 },
  caption: { color: "#c7c1b8", fontSize: 13, lineHeight: 19, paddingHorizontal: 14, paddingTop: 4 },
  hashtags: { color: "#18a2a6", fontSize: 12, paddingHorizontal: 14, paddingTop: 6 },

  qrStrip: { flexDirection: "row", alignItems: "center", gap: 10, margin: 14, backgroundColor: "#0d0f11", borderRadius: 12, padding: 10 },
  qrBox: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#fff9ec", alignItems: "center", justifyContent: "center" },
  qrCode: { color: "#fff9ec", fontSize: 12, fontWeight: "700" },
  qrHint: { color: "#a39d94", fontSize: 10 },
  verifyBtn: { backgroundColor: "#18a2a6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  verifyBtnText: { color: "#062014", fontSize: 11, fontWeight: "700" },

  actions: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.06)", paddingVertical: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  actionText: { color: "#a39d94", fontSize: 12, fontWeight: "600" },
  approveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, margin: 12, marginTop: 0, backgroundColor: "rgba(24,162,166,0.12)", borderRadius: 10, paddingVertical: 11 },
  approveBtnText: { color: "#18a2a6", fontWeight: "700", fontSize: 13 },
  pendingNote: { color: "#edb54c", fontSize: 11, paddingHorizontal: 14, paddingBottom: 12 },

  comments: { borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.06)", padding: 12, gap: 10 },
  noComments: { color: "#a39d94", fontSize: 12 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  commentAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#26302A", alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: "#18a2a6", fontSize: 10, fontWeight: "700" },
  commentText: { color: "#c7c1b8", fontSize: 12, flex: 1, lineHeight: 17 },
  commentAuthor: { color: "#fff9ec", fontWeight: "700" },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  commentInput: { flex: 1, backgroundColor: "#0d0f11", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, color: "#fff9ec", fontSize: 12 },
  sendText: { color: "#18a2a6", fontWeight: "700", fontSize: 13, paddingHorizontal: 6 },
});
