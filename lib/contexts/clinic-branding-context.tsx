"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clinicBrandingService } from "@/lib/services/settings";
import {
  DEFAULT_CLINIC_BRANDING,
  type ClinicBranding,
} from "@/lib/entity/settings";

const STORAGE_KEY = "clinic-branding-cache-v1";

interface ClinicBrandingContextType extends ClinicBranding {
  loading: boolean;
  /**
   * Actualiza la marca en memoria + caché sin refetch. Úsalo tras guardar
   * cambios en Opciones Generales (nombre/logo) para que Sidebar y login
   * queden "vigentes en todo el sistema" de inmediato, sin esperar a un
   * reload completo (el provider solo hace fetch una vez al montar).
   */
  updateBranding: (patch: Partial<ClinicBranding>) => void;
}

const ClinicBrandingContext = createContext<ClinicBrandingContextType | undefined>(
  undefined,
);

/** Lee la última marca cacheada. Solo se llama desde un efecto (nunca en render): evita mismatch de hidratación. */
function readCachedBranding(): ClinicBranding | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ClinicBranding> | null;
    if (!parsed || typeof parsed.name !== "string") return null;

    return {
      name: parsed.name,
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
    };
  } catch {
    return null;
  }
}

function writeCachedBranding(branding: ClinicBranding) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // Cuota excedida o almacenamiento no disponible (modo privado): ignorar,
    // la marca simplemente no se cachea para la próxima carga.
  }
}

/**
 * ClinicBrandingProvider — marca visible de la clínica (nombre + logo).
 *
 * Se monta en `root-client.tsx` envolviendo TODO el árbol (login incluido)
 * porque el endpoint `GET /clinic/branding` es PÚBLICO: no requiere sesión.
 * Hace fetch una única vez al montar. Para pintar sin parpadeo, lee la
 * última marca cacheada en `localStorage` — SIEMPRE dentro de un efecto,
 * nunca en el cuerpo de render, para no romper la hidratación SSR — y cae
 * al valor por defecto ("Clinic Flow 360", sin logo) si no hay caché ni
 * respuesta todavía.
 */
export function ClinicBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<ClinicBranding>(DEFAULT_CLINIC_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedBranding();
    if (cached) setBranding(cached);

    let active = true;

    clinicBrandingService
      .getClinicBranding()
      .then((data) => {
        if (!active) return;
        setBranding(data);
        writeCachedBranding(data);
      })
      .catch((err) => {
        // Silencioso a propósito: la marca cae al caché/default y esto se
        // dispara también en el login (sin sesión), donde un toast de error
        // sería ruido para el usuario.
        console.error(
          "[ClinicBranding] No se pudo cargar la marca de la clínica:",
          err,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateBranding = (patch: Partial<ClinicBranding>) => {
    setBranding((current) => {
      const next = { ...current, ...patch };
      writeCachedBranding(next);
      return next;
    });
  };

  return (
    <ClinicBrandingContext.Provider value={{ ...branding, loading, updateBranding }}>
      {children}
    </ClinicBrandingContext.Provider>
  );
}

export function useClinicBranding(): ClinicBrandingContextType {
  const context = useContext(ClinicBrandingContext);
  if (!context) {
    throw new Error(
      "useClinicBranding must be used within ClinicBrandingProvider",
    );
  }
  return context;
}
