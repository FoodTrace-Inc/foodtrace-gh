import { useCallback, useEffect, useState } from "react";
import type { AuthResponse } from "@foodtrace/shared";
import { apiBase, fetchWithTimeout } from "../lib/api";
import { usePalette } from "../theme/ThemeContext";

type Post = {
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

// Vibrant per-domain card backdrop, independent of light/dark mode — these
// are meant to pop the way a food-delivery app's category cards do.
const DOMAIN_GRADIENT: Record<string, { bg: string; text: string; sub: string }> = {
  food: { bg: "linear-gradient(160deg, #ffd9c2 0%, #ffb98a 100%)", text: "#4a2408", sub: "#7a4a20" },
  drug: { bg: "linear-gradient(160deg, #d6e8ff 0%, #a9c9ff 100%)", text: "#10285c", sub: "#2a4a8a" },
  farm: { bg: "linear-gradient(160deg, #e4f5c9 0%, #c3e888 100%)", text: "#263c08", sub: "#4a6a1a" },
};

function statusPill(status: string, pending: boolean): { bg: string; fg: string; label: string } {
  if (pending) return { bg: "rgba(140,90,10,0.85)", fg: "#ffe1a3", label: "Pending" };
  if (status === "recalled") return { bg: "rgba(150,20,20,0.85)", fg: "#ffc0c0", label: "Recalled" };
  if (status === "unverified") return { bg: "rgba(140,90,10,0.85)", fg: "#ffe1a3", label: "Unverified" };
  return { bg: "rgba(20,60,40,0.85)", fg: "#9ce8bd", label: "Verified" };
}

export function MarketplaceSection({ session }: { session: AuthResponse }) {
  const token = session.token;
  const role = session.user.role;
  const isSeller = SELLER_ROLES.includes(role);
  const isRegulator = role === "regulator";

  const palette = usePalette();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showCompose, setShowCompose] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const domain = FILTERS.find((f) => f.key === filter)?.domain;
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts${domain ? `?domain=${domain}` : ""}`, {
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
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts/${p.id}/like`, { method: "POST", headers: auth });
      if (!res.ok) return void loadFeed();
      const d = await res.json();
      if (typeof d.likeCount === "number") patch(p.id, { likedByViewer: d.liked, likeCount: d.likeCount });
    } catch { void loadFeed(); }
  }

  async function toggleSave(p: Post) {
    patch(p.id, { savedByViewer: !p.savedByViewer });
    try {
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts/${p.id}/save`, { method: "POST", headers: auth });
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
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts/${p.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.ok ? await res.json() : { comments: [] };
      setOpenComments((prev) => ({ ...prev, [p.id]: d.comments ?? [] }));
    } catch { setOpenComments((prev) => ({ ...prev, [p.id]: [] })); }
  }

  async function submitComment(p: Post) {
    const body = (draft[p.id] || "").trim();
    if (!body) return;
    setDraft((prev) => ({ ...prev, [p.id]: "" }));
    try {
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts/${p.id}/comments`, { method: "POST", headers: auth, body: JSON.stringify({ body }) });
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
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts/${p.id}/approve`, { method: "PATCH", headers: auth });
      if (!res.ok) void loadFeed();
    } catch { void loadFeed(); }
  }

  return (
    <section style={{ background: palette.cardBg, borderRadius: 22, padding: 20, border: `1px solid ${palette.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: palette.textPrimary, fontSize: 20 }}>Marketplace</h2>
        {isSeller ? (
          <button onClick={() => setShowCompose((v) => !v)} style={{ background: palette.accent, color: palette.onAccent, border: "none", borderRadius: 999, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            {showCompose ? "Close" : "+ Showcase a product"}
          </button>
        ) : null}
      </div>

      {showCompose && isSeller ? (
        <ComposeForm token={token} role={role} onPosted={() => { setShowCompose(false); void loadFeed(); }} />
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 16px" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? palette.textPrimary : "transparent",
              color: filter === f.key ? palette.pageBg : palette.textSecondary,
              border: filter === f.key ? "none" : `1px solid ${palette.border}`,
              borderRadius: 999, padding: "6px 14px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && posts.length === 0 ? (
        <p style={{ color: palette.textSecondary }}>Loading feed…</p>
      ) : error && posts.length === 0 ? (
        <div><p style={{ color: "#f0999a" }}>{error}</p><button onClick={() => void loadFeed()} style={btn(true)}>Try again</button></div>
      ) : posts.length === 0 ? (
        <p style={{ color: palette.textSecondary }}>No products posted yet.</p>
      ) : (
        <div className="marketplace-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {posts.map((p) => {
            const pending = p.status === "pending";
            const pill = statusPill(p.safetyStatus, pending);
            const g = DOMAIN_GRADIENT[p.domain] ?? DOMAIN_GRADIENT.food;
            const isOpen = expandedId === p.id;
            return (
              <article
                key={p.id}
                onClick={() => setExpandedId(isOpen ? null : p.id)}
                style={{ background: g.bg, borderRadius: 20, padding: 14, cursor: "pointer", gridColumn: isOpen ? "1 / -1" : undefined }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ background: pill.bg, color: pill.fg, fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>{pill.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); void toggleSave(p); }}
                    aria-label="Save"
                    style={{ background: "none", border: "none", cursor: "pointer", color: g.text, fontSize: 15, padding: 0 }}
                  >
                    {p.savedByViewer ? "★" : "☆"}
                  </button>
                </div>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: 84, objectFit: "cover", borderRadius: 14, margin: "8px 0 10px", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: 84, borderRadius: 14, margin: "8px 0 10px", background: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    {p.domain === "drug" ? "💊" : p.domain === "farm" ? "🌿" : "🥤"}
                  </div>
                )}
                <p style={{ color: g.text, fontSize: 12.5, fontWeight: 700, margin: "0 0 2px" }}>{p.title}</p>
                <p style={{ color: g.sub, fontSize: 10.5, margin: 0 }}>{p.sellerName} · {p.location || p.domain}</p>

                {isOpen ? (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                    {p.caption ? <p style={{ color: g.text, fontSize: 13, margin: "0 0 8px" }}>{p.caption}</p> : null}
                    {p.hashtags?.length ? <p style={{ color: g.sub, fontSize: 12, margin: "0 0 8px" }}>{p.hashtags.map((h) => `#${h}`).join("  ")}</p> : null}
                    {p.qrCodeString ? <p style={{ color: g.sub, fontSize: 11.5, margin: "0 0 10px" }}>Verify code: <b>{p.qrCodeString}</b></p> : null}

                    <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                      <button onClick={() => void toggleLike(p)} style={act(p.likedByViewer ? "#d4537e" : g.sub)}>{p.likedByViewer ? "♥" : "♡"} {p.likeCount}</button>
                      <button onClick={() => void toggleComments(p)} style={act(g.sub)}>💬 {p.commentCount}</button>
                      <button onClick={() => sharePost(p)} style={act("#1a7a4a")}>➦ Share</button>
                    </div>

                    {pending && isRegulator ? (
                      <button onClick={() => void approve(p)} style={{ ...btn(true), width: "100%", marginBottom: 10 }}>✓ Approve this post</button>
                    ) : pending ? (
                      <p style={{ color: "#8a5a10", fontSize: 12, margin: "0 0 10px" }}>Awaiting regulator approval before it goes public.</p>
                    ) : null}

                    {openComments[p.id] ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {openComments[p.id].length === 0 ? <div style={{ color: g.sub, fontSize: 13 }}>No comments yet — be the first.</div> :
                          openComments[p.id].map((c) => <div key={c.id} style={{ color: g.text, fontSize: 13 }}><b>{c.authorName}</b> {c.body}</div>)}
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={draft[p.id] || ""} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="Add a comment…" style={{ flex: 1, ...input }} />
                          <button onClick={() => void submitComment(p)} style={btn(true)}>Send</button>
                        </div>
                      </div>
                    ) : null}
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
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      setStatus("Could not read that image.");
    }
  }

  async function submit() {
    if (!title.trim()) { setStatus("Add a product title."); return; }
    setBusy(true); setStatus("");
    try {
      const res = await fetchWithTimeout(`${apiBase}/marketplace/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), domain, caption: caption.trim(), location: location.trim() || null,
          hashtags: hashtags.split(/[,\s]+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
          qrCodeString: qr.trim() || null,
          imageUrl: image,
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
      <div style={{ color: "#a9c7b8", fontSize: 13 }}>Post a {domain} product. Add a photo, and its QR code to stamp the verified safety badge.</div>
      {image ? <img src={image} alt="preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }} /> : null}
      <label style={{ ...btn(false), display: "inline-block", width: "fit-content" }}>
        {image ? "Change photo" : "📷 Add product photo"}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void onPickImage(e.target.files?.[0])} />
      </label>
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

// Resize + compress an uploaded image to a small JPEG data URI so it can be
// stored directly on the post (no file server / S3 needed).
function fileToDataUrl(file: File, maxW = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image failed"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
const input = { background: "#192027", color: "#f4f4ef", border: "1px solid rgba(119,199,162,0.2)", borderRadius: 8, padding: "9px 12px", fontSize: 14 } as const;
function btn(primary: boolean) {
  return { background: primary ? "#77c7a2" : "transparent", color: primary ? "#05080b" : "#c4f1db", border: primary ? "none" : "1px solid #c4f1db", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" } as const;
}
function act(color: string) {
  return { background: "transparent", border: "none", color, fontSize: 14, cursor: "pointer", padding: 0 } as const;
}
