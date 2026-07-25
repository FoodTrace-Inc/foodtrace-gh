// Signature visual for the redesign — a ring of dots (inspired by a
// Dribbble "AI food scanner" cleanliness-score concept, re-colored to
// FoodTrace's own safe/caution/recalled palette) instead of a flat
// checkmark badge. Pure inline SVG, no new dependency.
type Status = "safe" | "caution" | "recalled";

const PALETTE: Record<Status, { color: string; glow: string; icon: string; label: string }> = {
  safe: { color: "#77c7a2", glow: "rgba(119,199,162,0.35)", icon: "✓", label: "Verified Safe" },
  caution: { color: "#efb64f", glow: "rgba(239,182,79,0.35)", icon: "⚠", label: "Caution" },
  recalled: { color: "#e0475c", glow: "rgba(224,71,92,0.4)", icon: "✕", label: "Recalled" },
};

export function statusToRingStatus(status: string): Status {
  const s = status.toLowerCase();
  if (s.includes("recall")) return "recalled";
  if (s.includes("caution") || s.includes("unverified") || s.includes("pending")) return "caution";
  return "safe";
}

export function SafetyRing({ status, size = 176 }: { status: Status; size?: number }) {
  const { color, glow, icon, label } = PALETTE[status];
  const dotCount = 44;
  const radius = size / 2 - 10;
  const center = size / 2;

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    // Dots "fill in" progressively for a lively, non-static feel rather
    // than a uniform ring — every dot present, but varying size/opacity.
    const wobble = 0.55 + 0.45 * Math.abs(Math.sin(angle * 3 + i));
    return { x, y, r: 2.2 + wobble * 1.6, opacity: 0.35 + wobble * 0.65 };
  });

  return (
    <div style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 24px ${glow})` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} opacity={d.opacity} />
        ))}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        <span style={{ fontSize: size * 0.26, color, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: size * 0.078, fontWeight: 800, color: "#f4f4ef", letterSpacing: 0.3, textAlign: "center", padding: "0 8px" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
