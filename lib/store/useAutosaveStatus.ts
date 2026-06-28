import { create } from "zustand";

/**
 * Estado EFÍMERO (no persistido) del guardado automático de la consulta activa.
 * Lo alimentan los puntos de guardado reales (motivo/dolor/notas vía
 * use-visit-record, y el odontograma vía callbacks del módulo) y lo consume el
 * banner de consulta para mostrar "Guardando…/Guardado/Error" en vez de un
 * indicador estático.
 *
 * El contador `pending` evita parpadeos cuando varios guardados (dolor 800ms,
 * notas, odontograma 300ms) ocurren casi a la vez: solo se considera "guardado"
 * cuando no queda ninguno en vuelo.
 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveStatusState {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  pending: number;
  /** Si algún guardado del lote en vuelo falló (para no enmascarar errores). */
  hadError: boolean;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
  reset: () => void;
}

export const useAutosaveStatus = create<AutosaveStatusState>((set) => ({
  status: "idle",
  lastSavedAt: null,
  pending: 0,
  hadError: false,
  markSaving: () => set((s) => ({ status: "saving", pending: s.pending + 1 })),
  markSaved: () =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      const done = pending === 0;
      return {
        pending,
        lastSavedAt: Date.now(),
        // Si hubo un error en el lote, el estado final es "error", no "saved".
        status: done ? (s.hadError ? "error" : "saved") : "saving",
        hadError: done ? false : s.hadError,
      };
    }),
  markError: () =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      const done = pending === 0;
      return {
        pending,
        status: done ? "error" : "saving",
        hadError: !done,
      };
    }),
  reset: () =>
    set({ status: "idle", lastSavedAt: null, pending: 0, hadError: false }),
}));
