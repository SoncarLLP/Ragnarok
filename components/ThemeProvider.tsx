"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "bronze" | "silver" | "gold" | "platinum" | "fire" | "diamond";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "bronze",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: string;
}) {
  const [theme, setThemeState] = useState<Theme>((initialTheme as Theme) ?? "bronze");

  // Keep the html data-theme attribute in sync on client
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
