import type { CSSProperties } from "react";

export type IconName =
  | "scan"
  | "route"
  | "bell"
  | "store"
  | "spark"
  | "cloud"
  | "leaf"
  | "factory"
  | "shield"
  | "pill"
  | "user"
  | "check"
  | "arrow"
  | "menu"
  | "close"
  | "globe";

// Stroke-based line icons that inherit `currentColor`, so they tint to the
// palette wherever they're used. Paths are drawn on a 24×24 grid.
const PATHS: Record<IconName, string> = {
  scan: "M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M4 12h16",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6a3 3 0 0 0 3-3V9",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  store: "M3 9l1.5-5h15L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 20v-6h6v6",
  spark: "M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5 10.1 7.6 12 3ZM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8L19 15Z",
  cloud: "M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 19h10.5Z",
  leaf: "M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-5 16-9 16ZM11 20c0-6 3-9 8-11",
  factory: "M2 20h20M4 20V9l6 4V9l6 4V4h4v16M8 20v-4M14 20v-4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3ZM9.5 12l2 2 3.5-4",
  pill: "M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7l-6 6ZM8.5 8.5l7 7",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  check: "M20 6 9 17l-5-5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z",
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 22, color = "currentColor", strokeWidth = 1.7, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={style}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
