import { create } from "zustand";

/**
 * Borradores de nota de evolución que sobreviven al desmontaje del editor.
 *
 * POR QUÉ EXISTE: `ClinicalNotesEditor` guarda el HTML en un `useState` local y
 * solo persiste con el botón explícito — no hay autoguardado ni flush al
 * desmontar. Mientras el editor y el odontograma vivían juntos en la pestaña
 * Workspace eso era inocuo, porque no había que salir del editor para dibujar.
 * Con las cuatro pestañas fijas y el odontograma en la suya, el flujo normal de
 * una consulta por debajo de 1536px —escribir un poco, mirar una pieza, volver—
 * obliga a desmontar el editor: Radix desmonta la pestaña inactiva, el `useState`
 * muere y al volver se repuebla con la copia del servidor. Tres párrafos escritos
 * y no guardados desaparecían sin aviso, sin borrador y sin deshacer.
 *
 * NO es autoguardado ni sustituye al botón Guardar: el borrador vive solo en
 * memoria de la pestaña del navegador y se descarta al guardar de verdad. Es
 * exactamente lo que su nombre dice, y por eso NO se persiste en localStorage —
 * un borrador clínico sobreviviendo a un cierre de sesión sería peor problema
 * que el que resuelve.
 */
interface VisitNoteDraftsState {
  /** appointmentId → HTML sin guardar. */
  drafts: Record<string, string>;
  setDraft: (appointmentId: string, html: string) => void;
  getDraft: (appointmentId: string) => string | undefined;
  /** Se llama tras un guardado con éxito: el borrador ya no aporta nada. */
  clearDraft: (appointmentId: string) => void;
}

export const useVisitNoteDrafts = create<VisitNoteDraftsState>((set, get) => ({
  drafts: {},
  setDraft: (appointmentId, html) =>
    set((s) => ({ drafts: { ...s.drafts, [appointmentId]: html } })),
  getDraft: (appointmentId) => get().drafts[appointmentId],
  clearDraft: (appointmentId) =>
    set((s) => {
      if (!(appointmentId in s.drafts)) return s;
      const next = { ...s.drafts };
      delete next[appointmentId];
      return { drafts: next };
    }),
}));
