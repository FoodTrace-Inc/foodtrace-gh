import type { Palette } from "../theme/ThemeContext";

/**
 * The hero brand motif — a checkmark disc inside two pulsing rings, echoing the
 * mobile app's SplashIntro. The pulse animations live in index.css
 * (`ft-ring-pulse`) and respect prefers-reduced-motion.
 */
export function BrandRing({ p, size = 220 }: { p: Palette; size?: number }) {
  const disc = size * 0.46;
  return (
    <div
      style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}
      aria-hidden
    >
      <span className="ft-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${p.accent}`, opacity: 0.5 }} />
      <span className="ft-ring ft-ring--delay" style={{ position: "absolute", inset: size * 0.12, borderRadius: "50%", border: `2px solid ${p.accent}`, opacity: 0.4 }} />
      <div
        style={{
          width: disc,
          height: disc,
          borderRadius: "50%",
          background: p.accent,
          display: "grid",
          placeItems: "center",
          boxShadow: `0 20px 60px -18px ${p.accent}`,
        }}
      >
        <svg width={disc * 0.5} height={disc * 0.5} viewBox="0 0 24 24" fill="none" stroke={p.onAccent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </div>
  );
}
