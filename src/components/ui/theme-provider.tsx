"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** 5 soft themes — kalem, bukan warna mencolok */
export const THEMES = [
  {
    id: "blue",
    name: "Blue",
    primary: "#1a73e8",
    dark: "#1557b0",
    light: "#e8f0fe",
  },
  {
    id: "sage",
    name: "Sage",
    primary: "#3b8a6e",
    dark: "#2d6e57",
    light: "#d4ede3",
  },
  {
    id: "lavender",
    name: "Lavender",
    primary: "#7c5cfc",
    dark: "#5c3fc9",
    light: "#ede9fe",
  },
  {
    id: "sky",
    name: "Sky",
    primary: "#0e9f8a",
    dark: "#0b7d6c",
    light: "#d4f5f0",
  },
  {
    id: "blush",
    name: "Blush",
    primary: "#d66b7a",
    dark: "#b8505f",
    light: "#fbeaec",
  },
] as const;

const STORAGE_KEY = "esd-theme";

/** Apply theme CSS variables to <html> element and persist to localStorage */
export function applyTheme(primary: string, dark: string, light: string) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", primary, "important");
  root.style.setProperty("--color-primary-dark", dark, "important");
  root.style.setProperty("--color-primary-light", light, "important");
  // Persist to localStorage so it survives page reload
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ primary, dark, light }));
  } catch {
    // localStorage might be unavailable
  }
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const supabase = createClient();

    // 1. Apply from localStorage instantly (sync, no flash)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const theme = JSON.parse(saved);
        if (theme?.primary) {
          applyTheme(theme.primary, theme.dark, theme.light);
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch theme from DB on mount (backup, overwrites localStorage)
    supabase
      .from("app_config")
      .select("theme_color, theme_dark, theme_light")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          applyTheme(
            data.theme_color || "#1a73e8",
            data.theme_dark || "#1557b0",
            data.theme_light || "#e8f0fe"
          );
        }
      });

    // Listen for live theme updates from settings page
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.theme) {
        applyTheme(detail.theme.primary, detail.theme.dark, detail.theme.light);
      } else if (detail?.themeColor && detail?.themeDark && detail?.themeLight) {
        applyTheme(detail.themeColor, detail.themeDark, detail.themeLight);
      }
    };

    window.addEventListener("site-config-changed", handler);
    return () => window.removeEventListener("site-config-changed", handler);
  }, []);

  return <>{children}</>;
}
