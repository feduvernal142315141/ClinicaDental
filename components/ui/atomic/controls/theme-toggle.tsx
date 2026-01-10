"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useTheme } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

/**
 * Theme toggle button with sun/moon icon
 *
 * @example
 * <ThemeToggle />
 * <ThemeToggle variant="ghost" size="sm" />
 * <ThemeToggle showLabel />
 */
export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("relative", className)}
        disabled
      >
        <Sun className="h-5 w-5 bg-amber-400" />
        {showLabel && <span className="ml-2">Tema</span>}
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn("relative", className)}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {/* Animated icon transition */}
      <div className="relative h-5 w-5">
        <Sun
          className={cn(
            "absolute inset-0 h-5 w-5 transition-all duration-300 fill-amber-400 stroke-amber-400 hover:fill-amber-50 hover:stroke-amber-50",
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-5 w-5 transition-all duration-300",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>
      {showLabel && <span className="ml-2">{isDark ? "Oscuro" : "Claro"}</span>}
    </Button>
  );
}
