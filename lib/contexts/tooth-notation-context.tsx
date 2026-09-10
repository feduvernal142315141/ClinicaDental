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
  DEFAULT_TOOTH_NOTATION,
  describeTeeth,
  formatToothPlain,
  isToothNotation,
  type ToothNotation,
} from "@/lib/odontogram/notation";

const STORAGE_KEY = "clinic-tooth-notation-cache-v1";

interface ToothNotationContextType {
  notation: ToothNotation;
  setNotation: (next: ToothNotation) => void;
  refetch: () => Promise<void>;
  clearNotation: () => void;
}

const ToothNotationContext = createContext<ToothNotationContextType | undefined>(
  undefined,
);

function readCachedNotation(): ToothNotation | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isToothNotation(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeCachedNotation(notation: ToothNotation) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, notation);
  } catch {}
}

export function ToothNotationProvider({ children }: { children: ReactNode }) {
  const [notation, setNotationState] = useState<ToothNotation>(
    DEFAULT_TOOTH_NOTATION,
  );

  const refetch = useCallback(async () => {
    try {
      const settings = await clinicGeneralSettingsService.getGeneralSettings();
      if (isToothNotation(settings.toothNotation)) {
        setNotationState(settings.toothNotation);
        writeCachedNotation(settings.toothNotation);
      }
    } catch (err) {
      console.error(
        "[ToothNotation] No se pudo cargar la nomenclatura de la clínica:",
        err,
      );
    }
  }, []);

  const clearNotation = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    setNotationState(DEFAULT_TOOTH_NOTATION);
  }, []);

  useEffect(() => {
    const cached = readCachedNotation();
    if (cached) setNotationState(cached);

    if (!getAccessToken()) return;

    void refetch();
  }, [refetch]);

  const setNotation = useCallback((next: ToothNotation) => {
    setNotationState(next);
    writeCachedNotation(next);
  }, []);

  const value = useMemo(
    () => ({ notation, setNotation, refetch, clearNotation }),
    [notation, setNotation, refetch, clearNotation],
  );

  return (
    <ToothNotationContext.Provider value={value}>
      {children}
    </ToothNotationContext.Provider>
  );
}

export function useToothNotation(): ToothNotationContextType {
  const context = useContext(ToothNotationContext);
  if (!context) {
    throw new Error(
      "useToothNotation must be used within ToothNotationProvider",
    );
  }
  return context;
}

interface ToothLabelApi {
  notation: ToothNotation;
  plain: (fdi: number) => string;
  describe: (fdis: readonly number[]) => string;
}

export function useToothLabel(): ToothLabelApi {
  const { notation } = useToothNotation();

  return useMemo(
    () => ({
      notation,
      plain: (fdi: number) => formatToothPlain(fdi, notation),
      describe: (fdis: readonly number[]) => describeTeeth(fdis, notation),
    }),
    [notation],
  );
}
