"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { useTheme } from "@/lib/hooks/use-theme";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";
import type { FeedbackMetadata } from "@/lib/entity/feedback";

/** Versión de la app — se lee una sola vez del build. */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

/**
 * Parsea el user-agent a algo legible (ej. "Chrome 126 / macOS").
 * No necesita ser perfecto — es contexto para el dev, no analytics.
 */
function parseBrowser(ua: string): string {
  if (ua.includes("Firefox/")) {
    const v = ua.match(/Firefox\/([\d.]+)/)?.[1] ?? "";
    return `Firefox ${v}`;
  }
  if (ua.includes("Edg/")) {
    const v = ua.match(/Edg\/([\d.]+)/)?.[1] ?? "";
    return `Edge ${v}`;
  }
  if (ua.includes("Chrome/")) {
    const v = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? "";
    return `Chrome ${v}`;
  }
  if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    const v = ua.match(/Version\/([\d.]+)/)?.[1] ?? "";
    return `Safari ${v}`;
  }
  return ua.slice(0, 60);
}

function parseOS(ua: string): string {
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "";
}

/**
 * Hook que captura toda la metadata del contexto actual del usuario.
 * Se llama al momento de abrir el modal de feedback para congelar el estado.
 */
export function useFeedbackMetadata() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const consultation = useActiveConsultation();

  const capture = useCallback((): FeedbackMetadata => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const browser = parseBrowser(ua);
    const os = parseOS(ua);
    const browserLabel = os ? `${browser} / ${os}` : browser;

    return {
      currentUrl: typeof window !== "undefined" ? window.location.href : "",
      currentRoute: pathname,
      browser: browserLabel,
      screenSize:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "",
      theme: resolvedTheme ?? "light",
      appVersion: APP_VERSION,
      activePatientId: consultation.patientId ?? undefined,
      activeAppointmentId: consultation.appointmentId ?? undefined,
    };
  }, [pathname, resolvedTheme, consultation.patientId, consultation.appointmentId]);

  return {
    capture,
    userId: user?.id ?? "",
    userName: user?.roleName ?? "",
  };
}
