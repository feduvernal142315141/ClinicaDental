"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { servicesService } from "@/lib/services/services";
import { extractApiErrorMessage } from "@/lib/utils/notify-error";
import type { ServiceListItem } from "@/lib/entity/services";

export interface UseAddToPlanCatalogResult {
  /**
   * Servicios con `odontogramEnabled=false`: los que NO se marcan sobre una
   * pieza. Son el motivo de existir del panel — hoy no hay ninguna otra forma
   * de planificarlos.
   */
  generalServices: ServiceListItem[];
  /** Servicios con `odontogramEnabled=true`: se presupuestan pieza a pieza. */
  toothServices: ServiceListItem[];
  loading: boolean;
  /** Mensaje real del backend si la lectura falló; `null` si fue bien. */
  error: string | null;
  /** Reintenta la carga del catálogo. */
  retry: () => void;
}

/**
 * useAddToPlanCatalog
 *
 * Catálogo de servicios del panel "Añadir al plan", partido en sus dos mitades
 * EXCLUYENTES: las dos peticiones son complementarias (`odontogramEnabled`
 * true/false sobre el mismo catálogo activo), así que juntas son el catálogo
 * entero y ninguna ficha puede salir en las dos pestañas.
 *
 * Se piden LAS DOS de una vez, aunque el panel abra en "Generales": cambiar de
 * pestaña con un spinner delante convierte una comparación de precios en dos
 * esperas, y son dos peticiones de ≤100 fichas que el usuario ya provocó al
 * abrir el panel.
 *
 * Los errores NO hacen toast: van a `error` para que el panel pinte su propio
 * estado con reintento. Un toast se desvanece y deja una lista vacía que se lee
 * como "esta clínica no tiene servicios", que es justo la confusión que el
 * estado vacío honesto de esta pantalla intenta evitar.
 *
 * @param enabled `false` mientras el panel está cerrado: abrir la pantalla del
 *   plan no debe pedir el catálogo. Una vez cargado con éxito, cerrar y volver
 *   a abrir NO vuelve a pedirlo (el catálogo de servicios no cambia mientras se
 *   presupuesta); `retry()` es la única vía para forzar otra lectura.
 */
export function useAddToPlanCatalog(
  enabled: boolean,
): UseAddToPlanCatalogResult {
  const [generalServices, setGeneralServices] = useState<ServiceListItem[]>([]);
  const [toothServices, setToothServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  /** Ya resuelto con éxito: reabrir el panel no vuelve a pedir el catálogo. */
  const loadedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // El salto a `enabled` se refleja DURANTE el render, no en el efecto: el
  // efecto corre tras el commit, así que llegaría a pintarse un fotograma con
  // `loading=false` y cero servicios — o sea, el estado vacío "esta clínica no
  // tiene servicios generales" sobre un catálogo que ni se ha pedido.
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    if (enabled && !loadedRef.current) {
      setLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (!enabled || loadedRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      servicesService.getGeneralServices(),
      servicesService.getActiveOdontogramServices(),
    ])
      .then(([general, tooth]) => {
        if (cancelled || !mountedRef.current) return;
        // Solo se marca como cargado cuando SALIÓ BIEN: si falla, reabrir el
        // panel vuelve a intentarlo en vez de dejarlo vacío para siempre.
        loadedRef.current = true;
        setGeneralServices(general ?? []);
        setToothServices(tooth ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        setError(
          extractApiErrorMessage(err) ??
            "No se pudo cargar el catálogo de servicios.",
        );
        setGeneralServices([]);
        setToothServices([]);
      })
      .finally(() => {
        if (cancelled || !mountedRef.current) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, retryToken]);

  const retry = useCallback(() => {
    loadedRef.current = false;
    setRetryToken((token) => token + 1);
  }, []);

  return { generalServices, toothServices, loading, error, retry };
}
