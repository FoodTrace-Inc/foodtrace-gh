import { useTheme, usePalette } from "../theme/ThemeContext";

/** Pill switch that flips light/dark, matching the mobile app's toggle. */
export function ThemeToggle({ size = 46 }: { size?: number }) {
  const { theme, toggleTheme } = useTheme();
  const p = usePalette();
  const h = size * 0.565;
  const knob = h - 6;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      style={{
        width: size,
        height: h,
        borderRadius: 999,
        background: theme === "dark" ? "#1c2620" : "#dfe6e1",
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: theme === "dark" ? p.accent : "#ffffff",
          boxShadow: theme === "light" ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
          left: theme === "dark" ? size - knob - 3 : 3,
          transition: "left 0.16s ease",
        }}
      />
    </button>
  );
}
