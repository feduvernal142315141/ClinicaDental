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
  formatToothListPlain,
  formatToothNumber,
  formatToothPlain,
  isToothNotation,
  type ToothNotation,
} from "@/lib/odontogram/notation";

const STORAGE_KEY = "clinic-tooth-notation-cache-v1";

interface ToothNotationContextType {
  /** Nomenclatura vigente de la clínica. Es PRESENTACIÓN: el dato guardado sigue siendo FDI. */
  notation: ToothNotation;
  /**
   * `true` mientras no se conozca la elección de la clínica (ni caché ni
   * respuesta todavía). Los consumidores que pintan MUCHAS piezas a la vez
   * (la carta de 32, una tabla, la impresión) deben esperar a que sea `false`
   * en lugar de pintar el defecto y renumerar delante del usuario.
   */
  loading: boolean;
  /**
   * Fija la notación en memoria + caché sin refetch. Úsalo tras guardar
   * Opciones Generales para que toda la app quede vigente de inmediato
   * (el provider solo hace fetch al montar y al completar el login).
   */
  setNotation: (next: ToothNotation) => void;
  /**
   * Vuelve a pedir la configuración al backend. Tenant-aware: el token viaja
   * en la petición. Úsalo al COMPLETAR el login, para pasar de la notación
   * cacheada (posible otra clínica) a la de la clínica autenticada.
   */
  refetch: () => Promise<void>;
  /**
   * Limpia la caché y vuelve al defecto. Úsalo en LOGOUT para que el próximo
   * usuario (posible otra clínica) no herede la notación anterior.
   */
  clearNotation: () => void;
}

const ToothNotationContext = createContext<ToothNotationContextType | undefined>(
  undefined,
);

/** Lee la última notación cacheada. Solo desde un efecto (nunca en render): evita mismatch de hidratación. */
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
  } catch {
    // Cuota excedida o almacenamiento no disponible (modo privado): ignorar,
    // simplemente no habrá caché para la próxima carga.
  }
}

/**
 * ToothNotationProvider — nomenclatura dental elegida por la clínica.
 *
 * Se monta en `root-client.tsx` ENVOLVIENDO a `AuthProvider` (junto al de
 * marca) porque es AuthProvider quien consume sus hooks: `refetch()` al
 * completar el login y `clearNotation()` en el logout. Un proveedor tiene que
 * ser ANCESTRO para que su consumidor pueda llamarlo.
 *
 * A diferencia de la marca, `GET /clinic/general-settings` NO es público: sin
 * sesión no se pide nada (un 401 aquí dispararía el modal global de "sesión
 * expirada" en la propia pantalla de login).
 *
 * Ante error conserva el último valor conocido y no grita: la elección de la
 * clínica no se pisa con el defecto por un fallo de red.
 */
export function ToothNotationProvider({ children }: { children: ReactNode }) {
  const [notation, setNotationState] = useState<ToothNotation>(
    DEFAULT_TOOTH_NOTATION,
  );
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const settings = await clinicGeneralSettingsService.getGeneralSettings();
      if (isToothNotation(settings.toothNotation)) {
        setNotationState(settings.toothNotation);
        writeCachedNotation(settings.toothNotation);
      }
    } catch (err) {
      // Silencioso a propósito (igual que la marca): la configuración ya la
      // reporta su propia pantalla; aquí un toast sería ruido. Se conserva el
      // último valor cacheado en vez de caer al defecto.
      console.error(
        "[ToothNotation] No se pudo cargar la nomenclatura de la clínica:",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const clearNotation = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // storage no disponible: nada que limpiar
      }
    }
    setNotationState(DEFAULT_TOOTH_NOTATION);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Calentar desde la caché SIEMPRE dentro del efecto (hidratación SSR).
    const cached = readCachedNotation();
    if (cached) setNotationState(cached);

    // Sin sesión no hay a quién preguntar: el valor cacheado (o el defecto) es
    // definitivo hasta que el login llame a `refetch()`.
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    void refetch();
  }, [refetch]);

  const setNotation = useCallback((next: ToothNotation) => {
    setNotationState(next);
    writeCachedNotation(next);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ notation, loading, setNotation, refetch, clearNotation }),
    [notation, loading, setNotation, refetch, clearNotation],
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

/** Los formateadores de `@/lib/odontogram/notation` ya ligados a la notación vigente. */
interface ToothLabelApi {
  notation: ToothNotation;
  /** Dígitos a pintar ("16" · "3" · "6"). Compacto; en Palmer es ambiguo sin su corchete. */
  format: (fdi: number) => string;
  /** Texto INEQUÍVOCO ("6 superior derecho"). Para aria, prosa, toasts e impresión. */
  plain: (fdi: number) => string;
  /** Lista en prosa: "16, 26" · "6 superior derecho, 6 superior izquierdo". */
  listPlain: (fdis: readonly number[]) => string;
  /** "Diente 16" · "Dientes 16, 17". Vacío si la lista está vacía. */
  describe: (fdis: readonly number[]) => string;
}

/**
 * Azúcar de lectura: los formateadores ya ligados a la notación de la clínica.
 *
 * La SALIDA es texto para el usuario: JSX, `aria-*`, `title` o construcción de
 * prosa. NUNCA una clave, un `key` de React, un miembro de Set/Map, un criterio
 * de comparación u ordenación, ni un parámetro `toothNumber`/`fdi` — la
 * identidad de la pieza es siempre el FDI.
 */
export function useToothLabel(): ToothLabelApi {
  const { notation } = useToothNotation();

  return useMemo(
    () => ({
      notation,
      format: (fdi: number) => formatToothNumber(fdi, notation),
      plain: (fdi: number) => formatToothPlain(fdi, notation),
      listPlain: (fdis: readonly number[]) =>
        formatToothListPlain(fdis, notation),
      describe: (fdis: readonly number[]) => describeTeeth(fdis, notation),
    }),
    [notation],
  );
}
