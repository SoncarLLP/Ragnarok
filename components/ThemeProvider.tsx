"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type Theme = "bronze" | "silver" | "gold" | "platinum" | "fire" | "diamond";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** null = follow system preference */
  lightMode: boolean | null;
  setLightMode: (mode: boolean | null) => void;
  /** Resolved value — true when light mode is visually active */
  isLightModeActive: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "bronze",
  setTheme: () => {},
  lightMode: null,
  setLightMode: () => {},
  isLightModeActive: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({
  children,
  initialTheme,
  initialLightMode,
  isSignedIn = false,
}: {
  children: React.ReactNode;
  initialTheme: string;
  /** Server-resolved preference from DB; null = follow system */
  initialLightMode: boolean | null;
  /** Whether a user is authenticated — affects localStorage read behaviour */
  isSignedIn?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(
    (initialTheme as Theme) ?? "bronze"
  );
  const [lightMode, setLightModeState] = useState<boolean | null>(
    initialLightMode
  );
  // Whether the OS/browser prefers light
  const [systemPrefersLight, setSystemPrefersLight] = useState(false);

  // ── Detect OS colour scheme preference ──────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setSystemPrefersLight(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── For non-signed-in users: read localStorage preference on mount ───────
  useEffect(() => {
    if (!isSignedIn && initialLightMode === null) {
      const stored = localStorage.getItem("nrs_light_mode");
      if (stored === "light") setLightModeState(true);
      else if (stored === "dark") setLightModeState(false);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resolved value ───────────────────────────────────────────────────────
  const isLightModeActive =
    lightMode !== null ? lightMode : systemPrefersLight;

  // ── Apply data-theme attribute ───────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── Apply data-mode attribute ────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    if (lightMode === null) {
      // Remove explicit attribute — CSS media query handles it natively
      html.removeAttribute("data-mode");
    } else {
      html.setAttribute("data-mode", lightMode ? "light" : "dark");
    }
  }, [lightMode]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  const setLightMode = useCallback((mode: boolean | null) => {
    // Add transition class for a smooth 0.3s mode switch
    const html = document.documentElement;
    html.classList.add("nrs-mode-transitioning");
    setLightModeState(mode);
    setTimeout(() => html.classList.remove("nrs-mode-transitioning"), 400);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, lightMode, setLightMode, isLightModeActive }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
