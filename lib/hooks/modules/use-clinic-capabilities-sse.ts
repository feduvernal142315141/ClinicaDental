"use client";

import { useEffect } from "react";
import {
  clinicCapabilitiesSseUrl,
  createClinicCapabilitiesSseTicket,
  getClinicCapabilitiesSessionId,
} from "@/lib/services/modules/clinic-capabilities-sse.service";

const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

export function useClinicCapabilitiesSse(enabled: boolean, onChanged: () => void): void {
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    let cancelled = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retry = 0;
    const sessionId = getClinicCapabilitiesSessionId();

    const clearReconnect = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const scheduleReconnect = () => {
      if (cancelled || !navigator.onLine || reconnectTimer) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(retry, RECONNECT_DELAYS_MS.length - 1)];
      retry++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (cancelled || !navigator.onLine) return;
      try {
        const ticketId = await createClinicCapabilitiesSseTicket(sessionId);
        if (cancelled) return;
        source?.close();
        source = new EventSource(clinicCapabilitiesSseUrl(ticketId));
        source.addEventListener("connected", () => {
          retry = 0;
          onChanged();
        });
        source.addEventListener("capabilities-changed", onChanged);
        source.onerror = () => {
          source?.close();
          source = null;
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    const handleOnline = () => {
      clearReconnect();
      void connect();
    };
    const handleOffline = () => {
      clearReconnect();
      source?.close();
      source = null;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void connect();

    return () => {
      cancelled = true;
      clearReconnect();
      source?.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, onChanged]);
}
