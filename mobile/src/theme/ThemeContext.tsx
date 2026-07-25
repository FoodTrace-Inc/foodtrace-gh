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
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") setTheme(stored);
      } catch {
        // ignore — default to dark
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
}

const dark: Palette = {
  pageBg: "#05080b",
  heroBg: "#0d3428",
  cardBg: "#10161b",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#f4f4ef",
  textSecondary: "#93b9ac",
  fieldBg: "#0b0f13",
  accent: "#77c7a2",
  onAccent: "#062014",
  topBarBg: "#071a10",
};

const light: Palette = {
  pageBg: "#f4f6f4",
  heroBg: "#ffe9c2",
  cardBg: "#ffffff",
  border: "rgba(16,36,28,0.1)",
  textPrimary: "#10241c",
  textSecondary: "#5c6f66",
  fieldBg: "#ffffff",
  accent: "#1c9c6e",
  onAccent: "#ffffff",
  topBarBg: "#ffffff",
};

export function usePalette(): Palette {
  const { theme } = useTheme();
  return theme === "dark" ? dark : light;
}
