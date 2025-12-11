"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Custom hook for theme management
 *
 * @returns {Object} Theme state and methods
 * - theme: Current theme ('light' | 'dark' | 'system')
 * - resolvedTheme: Actual theme being used ('light' | 'dark')
 * - setTheme: Function to change theme
 * - toggleTheme: Function to toggle between light and dark
 * - mounted: Whether the component has mounted (prevents hydration issues)
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    toggleTheme,
    mounted,
  };
}
