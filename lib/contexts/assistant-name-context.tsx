"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { getAccessToken } from "@/lib/auth/token-client";
import { clinicGeneralSettingsService } from "@/lib/services/settings";
import {
  DEFAULT_ASSISTANT_NAME,
  resolveAssistantName,
} from "@/lib/entity/settings";

const STORAGE_KEY = "clinic-assistant-name-cache-v1";

interface AssistantNameContextType {
  /** Nombre visible del asistente de WhatsApp; «Dalia» si la clínica no lo configuró. */
  assistantName: string;
  setAssistantName: (next: string) => void;
  refetch: () => Promise<void>;
  clearAssistantName: () => void;
}

// Sin proveedor (pantallas aisladas, tests) el nombre es el de por defecto.
const AssistantNameContext = createContext<AssistantNameContextType>({
  assistantName: DEFAULT_ASSISTANT_NAME,
  setAssistantName: () => {},
  refetch: async () => {},
  clearAssistantName: () => {},
});

function readCachedName(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCachedName(name: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {}
}

/**
 * AssistantNameProvider — nombre con el que la clínica llama a su asistente.
 *
 * Sale de `GET /clinic/general-settings` (misma caché que el resto de ajustes).
 * Envuelve a AuthProvider, que lo refresca al completar el login y lo limpia en
 * el logout. El identificador `DALIA` de la API no cambia: esto es solo la etiqueta.
 */
export function AssistantNameProvider({ children }: { children: ReactNode }) {
  const [assistantName, setNameState] = useState(DEFAULT_ASSISTANT_NAME);

  const setAssistantName = useCallback((next: string) => {
    const name = resolveAssistantName(next);
    setNameState(name);
    writeCachedName(name);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const settings = await clinicGeneralSettingsService.getGeneralSettings();
      setAssistantName(resolveAssistantName(settings.assistantName));
    } catch (err) {
      console.error(
        "[AssistantName] No se pudo cargar el nombre de la asistente:",
        err,
      );
    }
  }, [setAssistantName]);

  const clearAssistantName = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    setNameState(DEFAULT_ASSISTANT_NAME);
  }, []);

  useEffect(() => {
    const cached = readCachedName();
    if (cached) setNameState(resolveAssistantName(cached));

    if (!getAccessToken()) return;

    void refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ assistantName, setAssistantName, refetch, clearAssistantName }),
    [assistantName, setAssistantName, refetch, clearAssistantName],
  );

  return (
    <AssistantNameContext.Provider value={value}>
      {children}
    </AssistantNameContext.Provider>
  );
}

export function useAssistantName(): AssistantNameContextType {
  return useContext(AssistantNameContext);
}

const ASSISTANT_PLACEHOLDER = "{assistant}";

/**
 * Para textos traducidos que nombran a la asistente: sustituye `{assistant}`
 * por el nombre configurado. Uso: `withAssistant(t("inbox.handling.DALIA"))`.
 */
export function useAssistantText() {
  const { assistantName } = useAssistantName();

  const withAssistant = useCallback(
    (text: string) => text.split(ASSISTANT_PLACEHOLDER).join(assistantName),
    [assistantName],
  );

  return { assistantName, withAssistant };
}
