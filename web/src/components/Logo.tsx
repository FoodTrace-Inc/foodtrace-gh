import type { CSSProperties } from "react";

/**
 * The FoodTrace GH leaf/shield mark, inlined from foodtrace-logo.svg so it
 * scales crisply and never depends on a base-URL-relative asset path.
 * `light` and `dark` here are the mark's two green tones, not the app theme.
 */
export function LogoMark({ size = 28, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="FoodTrace GH logo"
      style={style}
    >
      <path fill="#39bf37" d="M348 469c-63-68-85-158-56-262 24-86 91-173 170-240-34 89 15 163 101 238 43 38 87 74 113 115l-107 62c-27-36-74-73-115-110-38-34-64-70-70-119-32 87 18 148 86 221-63 47-98 90-122 95Z" />
      <path fill="#39bf37" d="M196 478h632c0 137-106 248-237 248H433c-131 0-237-111-237-248Z" />
      <path fill="#39bf37" d="M452 700h120v116H452z" />
      <path fill="#006c39" d="M628 208c83 96 120 205 100 312-22 113-104 184-232 232-84 31-142 82-176 151 15-127 64-209 148-260 84-50 175-88 221-163 31-50 35-105 25-158-20 74-81 116-153 158-91 54-162 112-187 219-55-163 30-268 169-342 74-39 114-82 85-149Z" />
      <path fill="#39bf37" d="M324 906c31-96 108-148 220-187 109-38 176-86 199-180 3 87-34 154-112 198-64 36-150 52-218 95-47 30-78 70-89 74Z" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
  fontSize?: number;
}

/** Mark + "FoodTrace GH" wordmark, used in the nav, footer and shells. */
export function Logo({ size = 28, color, showText = true, fontSize = 15 }: LogoProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <LogoMark size={size} />
      {showText ? (
        <span style={{ fontWeight: 800, fontSize, letterSpacing: -0.2, color, whiteSpace: "nowrap" }}>
          FoodTrace <span style={{ opacity: 0.65 }}>GH</span>
        </span>
      ) : null}
    </span>
  );
}
