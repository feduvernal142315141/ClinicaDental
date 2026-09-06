import { create } from "zustand";

/**
 * Borrador de nota de evolución que sobrevive al desmontaje del editor.
 *
 * No es solo el HTML: un borrador sin SELLO no se puede comparar con nada, y sin
 * DUEÑO no se puede saber a quién pertenece. Los dos campos existen para que el
 * editor pueda decidir sin adivinar.
 */
export interface VisitNoteDraft {
  /** HTML sin guardar. */
  html: string;
  /**
   * `clinicalNotesUpdatedAt` de la copia del servidor de la que salió este
   * borrador. Sella el punto de partida: si al volver el servidor declara una
   * edición POSTERIOR, alguien más escribió y el borrador ya no es la
   * continuación de la nota vigente, sino una rama divergente que hay que
   * declararle al clínico antes de que la guarde encima.
   * `undefined` = el borrador nació sobre una visita sin nota guardada.
   */
  baseUpdatedAt?: string;
  /**
   * Usuario que lo escribió. Un borrador de otro profesional NO se restaura: el
   * cierre de sesión por inactividad deja la tablet libre y el siguiente que
   * entra no puede encontrarse el texto del anterior dentro de su editor.
   */
  userId?: string;
}

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
 * memoria de la pestaña del navegador y se descarta al guardar de verdad. Por
 * eso NO se persiste en localStorage.
 *
 * OJO — "memoria de la pestaña" NO es "hasta el cierre de sesión": `logout()`
 * navega con `router.push`, que no recarga la página, así que este módulo
 * sobrevive intacto al cambio de usuario. La caducidad la tiene que provocar
 * alguien: por eso existe `clearAll()` y por eso cada borrador lleva `userId`.
 */
interface VisitNoteDraftsState {
  /** appointmentId → borrador sin guardar. */
  drafts: Record<string, VisitNoteDraft>;
  setDraft: (appointmentId: string, draft: VisitNoteDraft) => void;
  getDraft: (appointmentId: string) => VisitNoteDraft | undefined;
  /** Se llama tras un guardado con éxito: el borrador ya no aporta nada. */
  clearDraft: (appointmentId: string) => void;
  /**
   * Borra TODOS los borradores. Se llama al cerrar sesión: sin esto, el texto
   * sin guardar de un profesional queda vivo en memoria para el siguiente que
   * inicie sesión en el mismo navegador.
   */
  clearAll: () => void;
}

export const useVisitNoteDrafts = create<VisitNoteDraftsState>((set, get) => ({
  drafts: {},
  setDraft: (appointmentId, draft) =>
    set((s) => ({ drafts: { ...s.drafts, [appointmentId]: draft } })),
  getDraft: (appointmentId) => get().drafts[appointmentId],
  clearDraft: (appointmentId) =>
    set((s) => {
      if (!(appointmentId in s.drafts)) return s;
      const next = { ...s.drafts };
      delete next[appointmentId];
      return { drafts: next };
    }),
  clearAll: () =>
    set((s) => (Object.keys(s.drafts).length === 0 ? s : { drafts: {} })),
}));
