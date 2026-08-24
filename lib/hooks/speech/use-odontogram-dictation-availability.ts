"use client";

import { useEffect, useState } from "react";
import { normalizeError } from "@/lib/errors/normalize-error";
import { speechService } from "@/lib/services/speech/speech.service";

/**
 * Interruptor del dictado del odontograma (HU-DICT-006): flag por clínica más
 * los recursos de prompt del backend. Lo consulta el HOST, no el módulo del
 * odontograma, y su resultado decide si se le inyecta el adapter de dictado.
 *
 * Solo un `{ enabled: false }` EXPLÍCITO oculta el control. Ante un fallo de la
 * consulta se monta igualmente, porque el POST del dictado es la puerta real:
 * responde 503 cuando la función está apagada o no es operativa, y ese 503 sí
 * llega al doctor con una explicación. Casos que cubre este criterio:
 *
 * - **404** — backend antiguo, todavía sin el endpoint. El control debe montar:
 *   ocultarlo dejaría la función invisible sin que nadie la haya apagado.
 * - **Red caída / timeout / 5xx** — fallo TRANSITORIO. Se monta: el coste de
 *   equivocarse es un dictado que falla con mensaje claro, mientras que ocultar
 *   hace desaparecer una función por un corte de un segundo, sin explicación y
 *   sin reintento (este hook solo consulta al montar).
 * - **401 / 403** — no es transitorio: la sesión o el permiso NIEGAN el acceso,
 *   y el POST también lo negaría. Ahí sí se oculta.
 *
 * El dictado es una funcionalidad opcional: pase lo que pase NO se notifica al
 * usuario. Un aviso de error a mitad de una consulta alarmaría por algo que el
 * doctor no necesita para trabajar; el diagnóstico va a `console.warn`.
 *
 * @param enabled - `false` evita la llamada (sin permiso, modo histórico…).
 */
export function useOdontogramDictationAvailability(enabled = true): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsAvailable(false);
      return;
    }

    let active = true;

    void speechService
      .getOdontogramDictationAvailability()
      .then((availability) => {
        // `!== false`: solo el apagado explícito oculta el control.
        if (active) setIsAvailable(availability.enabled !== false);
      })
      .catch((error: unknown) => {
        const { status, code, technical } = normalizeError(error);
        const accessDenied = status === 401 || status === 403;

        if (active) setIsAvailable(!accessDenied);

        console.warn(
          `[odontogram-dictation] No se pudo consultar la disponibilidad del dictado; el control ${
            accessDenied
              ? "se oculta (acceso denegado)"
              : "se monta igualmente y el POST decidirá (responde 503 si está apagado)"
          }.`,
          { status, code, technical },
        );
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return isAvailable;
}
