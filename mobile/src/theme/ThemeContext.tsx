import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "expo-sqlite/kv-store";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggleTheme: () => {} });

const STORAGE_KEY = "ft-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") setTheme(stored);
      } catch {
        // ignore — default to light (ProofLoop's cream home screen)
      }
    })();
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * ProofLoop design system palette. Two named modes exist (light/dark) so the
 * existing theme toggle keeps working, but per the ProofLoop spec these
 * aren't a generic light/dark mode — "light" is the everyday cream
 * Proof Hub look, "dark" is the focused scanner/proof-card look. Individual
 * screens (scanner, proof card) may force the dark palette's colors
 * regardless of the current mode, since those surfaces are always dark by
 * design.
 */
export interface Palette {
  pageBg: string;
  heroBg: string;
  cardBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  fieldBg: string;
  accent: string;
  onAccent: string;
  topBarBg: string;
  // ProofLoop accent roles, available regardless of mode
  signalCyan: string;
  marketAmber: string;
  civicBlue: string;
  freshLime: string;
}

const light: Palette = {
  pageBg: "#fff9ec", // Proof Cream
  heroBg: "#fff9ec",
  cardBg: "#ffffff",
  border: "rgba(24,23,22,0.08)",
  textPrimary: "#181716", // Ink Black
  textSecondary: "#716b63", // Muted Text
  fieldBg: "#ffffff",
  accent: "#18a2a6", // Signal Cyan
  onAccent: "#ffffff",
  topBarBg: "#fff9ec",
  signalCyan: "#18a2a6",
  marketAmber: "#edb54c",
  civicBlue: "#1b6d8f",
  freshLime: "#c9d95f",
};

const dark: Palette = {
  pageBg: "#111417", // Dark Screen
  heroBg: "#111417",
  cardBg: "#181716", // Ink Black
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#fff9ec",
  textSecondary: "#a39d94",
  fieldBg: "#0d0f11",
  accent: "#18a2a6",
  onAccent: "#ffffff",
  topBarBg: "#181716",
  signalCyan: "#18a2a6",
  marketAmber: "#edb54c",
  civicBlue: "#1b6d8f",
  freshLime: "#c9d95f",
};

export function usePalette(): Palette {
  const { theme } = useTheme();
  return theme === "dark" ? dark : light;
}
