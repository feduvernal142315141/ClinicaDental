"use client";

import { useState, useEffect } from "react";
import { Spin, ConfigProvider, theme } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

interface AppLoaderProps {
  children: React.ReactNode;
}

/**
 * App Loader Component
 * Shows a loading spinner until the app is fully mounted and styles are loaded
 * This prevents the Flash of Unstyled Content (FOUC)
 */
export function AppLoader({ children }: AppLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    const storedTheme = localStorage.getItem("theme");

    if (
      storedTheme === "dark" ||
      (!storedTheme && darkModeMediaQuery.matches)
    ) {
      setIsDark(true);
    }

    // Wait for styles to be applied
    // Using requestAnimationFrame ensures we wait for the next paint
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    });

    return () => cancelAnimationFrame(timer);
  }, []);

  if (isLoading) {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#141414" : "#ffffff",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      </ConfigProvider>
    );
  }

  return <>{children}</>;
}
