// Vibrant per-card gradients, matching the marketplace grid's color language.
// Used for stat rows across dashboard/manufacturer/pharmacist portals.
const GRADIENTS = [
  { bg: "linear-gradient(160deg, #d4f5e8 0%, #8fe0c0 100%)", text: "#0a3324" },
  { bg: "linear-gradient(160deg, #d6e8ff 0%, #a9c9ff 100%)", text: "#10285c" },
  { bg: "linear-gradient(160deg, #fff3b0 0%, #ffdd6b 100%)", text: "#4a3400" },
  { bg: "linear-gradient(160deg, #ffd6d6 0%, #ff9d9d 100%)", text: "#5c0f0f" },
];

export interface Metric {
  label: string;
  value: string | number;
}

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`, gap: 12 }}>
      {metrics.map((m, i) => {
        const g = GRADIENTS[i % GRADIENTS.length];
        return (
          <div key={m.label} style={{ background: g.bg, borderRadius: 16, padding: 14 }}>
            <p style={{ color: g.text, fontSize: 10.5, margin: "0 0 6px", fontWeight: 600, opacity: 0.85 }}>{m.label}</p>
            <p style={{ color: g.text, fontSize: 22, fontWeight: 800, margin: 0 }}>{m.value}</p>
          </div>
        );
      })}
    </div>
  );
}
