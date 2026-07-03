import { useCallback, useEffect, useState } from "react";
import type { AuthResponse } from "@foodtrace/shared";
import { apiBase } from "../lib/api";

type Post = {
  id: string;
  domain: string;
  title: string;
  caption: string;
  location: string | null;
  hashtags: string[];
  qrCodeString: string | null;
  safetyStatus: string;
  safetyLabel: string;
  status: string;
  sellerName: string;
  sellerRole: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
};

type Comment = { id: string; body: string; authorName: string };

const FILTERS = [
  { key: "all", label: "All Products", domain: null as string | null },
  { key: "food", label: "Food", domain: "food" },
  { key: "drug", label: "Drugs", domain: "drug" },
  { key: "farm", label: "Farms", domain: "farm" },
];
const SELLER_ROLES = ["manufacturer", "farmer", "pharmacist"];

function badgeStyle(status: string): { bg: string; fg: string } {
  if (status === "recalled") return { bg: "#2a0f0f", fg: "#f0999a" };
  if (status === "unverified") return { bg: "#241a08", fg: "#efb64f" };
  if (status === "epa_cleared") return { bg: "#0f2438", fg: "#8fc0f0" };
  return { bg: "#0f2c1f", fg: "#77c7a2" };
}

export function MarketplaceSection({ session }: { session: AuthResponse }) {
  const token = session.token;
  const role = session.user.role;
  const isSeller = SELLER_ROLES.includes(role);
  const isRegulator = role === "regulator";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showCompose, setShowCompose] = useState(false);

  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const domain = FILTERS.find((f) => f.key === filter)?.domain;
      const res = await fetch(`${apiBase}/marketplace/posts${domain ? `?domain=${domain}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status >= 500 ? "Server is waking up — please retry in a moment." : "Could not load the feed.");
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  function patch(id: string, changes: Partial<Post>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  async function toggleLike(p: Post) {
    patch(p.id, { likedByViewer: !p.likedByViewer, likeCount: p.likeCount + (p.likedByViewer ? -1 : 1) });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${p.id}/like`, { method: "POST", headers: auth });
      if (!res.ok) return void loadFeed();
      const d = await res.json();
      if (typeof d.likeCount === "number") patch(p.id, { likedByViewer: d.liked, likeCount: d.likeCount });
    } catch { void loadFeed(); }
  }

  async function toggleSave(p: Post) {
    patch(p.id, { savedByViewer: !p.savedByViewer });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${p.id}/save`, { method: "POST", headers: auth });
      if (!res.ok) return void loadFeed();
      const d = await res.json();
      if (typeof d.saved === "boolean") patch(p.id, { savedByViewer: d.saved });
    } catch { void loadFeed(); }
  }

  async function toggleComments(p: Post) {
    if (openComments[p.id]) {
      setOpenComments((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      return;
    }
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${p.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.ok ? await res.json() : { comments: [] };
      setOpenComments((prev) => ({ ...prev, [p.id]: d.comments ?? [] }));
    } catch { setOpenComments((prev) => ({ ...prev, [p.id]: [] })); }
  }

  async function submitComment(p: Post) {
    const body = (draft[p.id] || "").trim();
    if (!body) return;
    setDraft((prev) => ({ ...prev, [p.id]: "" }));
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${p.id}/comments`, { method: "POST", headers: auth, body: JSON.stringify({ body }) });
      const d = res.ok ? await res.json() : null;
      if (!d?.comment) throw new Error("failed");
      setOpenComments((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), d.comment] }));
      patch(p.id, { commentCount: p.commentCount + 1 });
    } catch { setDraft((prev) => ({ ...prev, [p.id]: body })); }
  }

  function sharePost(p: Post) {
    const text = `${p.title} — ${p.safetyLabel} on FoodTrace GH.${p.qrCodeString ? ` Verify code: ${p.qrCodeString}.` : ""} Scan before you buy.`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      void (navigator as any).share({ text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  async function approve(p: Post) {
    patch(p.id, { status: "active" });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${p.id}/approve`, { method: "PATCH", headers: auth });
      if (!res.ok) void loadFeed();
    } catch { void loadFeed(); }
  }

  return (
    <section style={{ background: "#11161b", borderRadius: 18, padding: 20, marginTop: 22, border: "1px solid rgba(119,199,162,0.16)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: "#f4f4ef", fontSize: 20 }}>Marketplace</h2>
        {isSeller ? (
          <button onClick={() => setShowCompose((v) => !v)} style={btn(true)}>{showCompose ? "Close" : "+ Showcase a product"}</button>
        ) : null}
      </div>

      {showCompose && isSeller ? (
        <ComposeForm token={token} role={role} onPosted={() => { setShowCompose(false); void loadFeed(); }} />
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 16px" }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={chip(filter === f.key)}>{f.label}</button>
        ))}
      </div>

      {loading && posts.length === 0 ? (
        <p style={{ color: "#a9c7b8" }}>Loading feed…</p>
      ) : error && posts.length === 0 ? (
        <div><p style={{ color: "#f0999a" }}>{error}</p><button onClick={() => void loadFeed()} style={btn(true)}>Try again</button></div>
      ) : posts.length === 0 ? (
        <p style={{ color: "#a9c7b8" }}>No products posted yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {posts.map((p) => {
            const pending = p.status === "pending";
            const b = pending ? { bg: "#241a08", fg: "#efb64f" } : badgeStyle(p.safetyStatus);
            const label = pending ? "Pending approval" : p.safetyLabel;
            const comments = openComments[p.id];
            return (
              <article key={p.id} style={{ background: "#0d1216", borderRadius: 14, padding: 16, border: "1px solid rgba(119,199,162,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={avatar}>{initials(p.sellerName)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#f4f4ef", fontWeight: 600 }}>{p.sellerName} <span style={roleTag}>{p.sellerRole}</span></div>
                    <div style={{ color: "#7d8a84", fontSize: 12 }}>{p.location ? `${p.location} · ` : ""}{p.domain}</div>
                  </div>
                  <span style={{ background: b.bg, color: b.fg, border: `1px solid ${b.fg}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600 }}>{label}</span>
                </div>
                {p.title ? <div style={{ color: "#f4f4ef", fontWeight: 600 }}>{p.title}</div> : null}
                {p.caption ? <div style={{ color: "#d8e2dc", fontSize: 14, marginTop: 4 }}>{p.caption}</div> : null}
                {p.hashtags?.length ? <div style={{ color: "#77c7a2", fontSize: 13, marginTop: 6 }}>{p.hashtags.map((h) => `#${h}`).join("  ")}</div> : null}
                {p.qrCodeString ? <div style={{ color: "#8aa79a", fontSize: 12, marginTop: 8 }}>Verify code: <b style={{ color: "#c4f1db" }}>{p.qrCodeString}</b></div> : null}

                <div style={{ display: "flex", gap: 18, marginTop: 12, borderTop: "1px solid rgba(119,199,162,0.1)", paddingTop: 10 }}>
                  <button onClick={() => void toggleLike(p)} style={act(p.likedByViewer ? "#d4537e" : "#a9c7b8")}>{p.likedByViewer ? "♥" : "♡"} {p.likeCount}</button>
                  <button onClick={() => void toggleComments(p)} style={act("#a9c7b8")}>💬 {p.commentCount}</button>
                  <button onClick={() => sharePost(p)} style={act("#25D366")}>➦ Share</button>
                  <button onClick={() => void toggleSave(p)} style={act(p.savedByViewer ? "#efb64f" : "#a9c7b8")}>{p.savedByViewer ? "★ Saved" : "☆ Save"}</button>
                </div>

                {pending && isRegulator ? (
                  <button onClick={() => void approve(p)} style={{ ...btn(true), marginTop: 10, width: "100%" }}>✓ Approve this post</button>
                ) : pending ? (
                  <div style={{ color: "#efb64f", fontSize: 12, marginTop: 8 }}>Awaiting regulator approval before it goes public.</div>
                ) : null}

                {comments ? (
                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(119,199,162,0.1)", paddingTop: 10, display: "grid", gap: 8 }}>
                    {comments.length === 0 ? <div style={{ color: "#7d8a84", fontSize: 13 }}>No comments yet — be the first.</div> :
                      comments.map((c) => <div key={c.id} style={{ color: "#cdd8d2", fontSize: 13 }}><b style={{ color: "#f4f4ef" }}>{c.authorName}</b> {c.body}</div>)}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={draft[p.id] || ""} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Add a comment…" style={{ flex: 1, ...input }} />
                      <button onClick={() => void submitComment(p)} style={btn(true)}>Send</button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ComposeForm({ token, role, onPosted }: { token: string; role: string; onPosted: () => void }) {
  const domain = role === "pharmacist" ? "drug" : role === "farmer" ? "farm" : "food";
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) { setStatus("Add a product title."); return; }
    setBusy(true); setStatus("");
    try {
      const res = await fetch(`${apiBase}/marketplace/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), domain, caption: caption.trim(), location: location.trim() || null,
          hashtags: hashtags.split(/[,\s]+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
          qrCodeString: qr.trim() || null,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.detail || "Could not post."); }
      setStatus("Submitted for approval.");
      setTimeout(onPosted, 700);
    } catch (e) { setStatus(e instanceof Error ? e.message : "Could not post."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ background: "#0d1216", borderRadius: 12, padding: 16, marginBottom: 14, border: "1px solid rgba(119,199,162,0.14)", display: "grid", gap: 8 }}>
      <div style={{ color: "#a9c7b8", fontSize: 13 }}>Post a {domain} product. Add its QR code to stamp the verified safety badge.</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" style={input} />
      <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" style={input} />
      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Greater Accra)" style={input} />
      <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="Hashtags: organic, Accra" style={input} />
      <input value={qr} onChange={(e) => setQr(e.target.value)} placeholder="Product QR code (e.g. FT-FD1001-2B5B7A)" style={input} />
      {status ? <div style={{ color: status.includes("Submitted") ? "#77c7a2" : "#f0999a", fontSize: 13 }}>{status}</div> : null}
      <button onClick={() => void submit()} disabled={busy} style={{ ...btn(true), opacity: busy ? 0.6 : 1 }}>{busy ? "Posting…" : "Post to marketplace"}</button>
    </div>
  );
}

function initials(name: string) {
  const p = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase()).join("") || "FT";
}
const avatar = { width: 40, height: 40, borderRadius: "50%", background: "#1d9e75", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 } as const;
const roleTag = { background: "rgba(119,199,162,0.16)", color: "#77c7a2", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, marginLeft: 6 } as const;
const input = { background: "#192027", color: "#f4f4ef", border: "1px solid rgba(119,199,162,0.2)", borderRadius: 8, padding: "9px 12px", fontSize: 14 } as const;
function btn(primary: boolean) {
  return { background: primary ? "#77c7a2" : "transparent", color: primary ? "#05080b" : "#c4f1db", border: primary ? "none" : "1px solid #c4f1db", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" } as const;
}
function chip(on: boolean) {
  return { background: on ? "#77c7a2" : "transparent", color: on ? "#05080b" : "#a9c7b8", border: on ? "none" : "1px solid rgba(119,199,162,0.3)", borderRadius: 999, padding: "6px 13px", fontSize: 12, cursor: "pointer" } as const;
}
function act(color: string) {
  return { background: "transparent", border: "none", color, fontSize: 14, cursor: "pointer", padding: 0 } as const;
}
