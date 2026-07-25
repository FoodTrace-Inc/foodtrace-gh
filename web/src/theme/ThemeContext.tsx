import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("ft-theme") as Theme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("ft-theme", theme);
    document.documentElement.dataset.ftTheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export interface Palette {
  pageBg: string;
  cardBg: string;
  cardBgAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  fieldBg: string;
  accent: string;
  onAccent: string;
}

const dark: Palette = {
  pageBg: "#05080b",
  cardBg: "#0d1216",
  cardBgAlt: "#10161a",
  border: "rgba(255,255,255,0.1)",
  textPrimary: "#f4f4ef",
  textSecondary: "#93b9ac",
  fieldBg: "#10161a",
  accent: "#77c7a2",
  onAccent: "#062014",
};

const light: Palette = {
  pageBg: "#f4f6f4",
  cardBg: "#ffffff",
  cardBgAlt: "#f7f8f6",
  border: "rgba(16,36,28,0.1)",
  textPrimary: "#10241c",
  textSecondary: "#5c6f66",
  fieldBg: "#ffffff",
  accent: "#1c9c6e",
  onAccent: "#ffffff",
};

export function usePalette(): Palette {
  const { theme } = useTheme();
  return theme === "dark" ? dark : light;
}
