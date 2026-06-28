import type { ClinicalEventStatus } from "../types";

/**
 * ClinicalEventStateMachine — protege la integridad del historial clínico.
 *
 * Política deliberadamente PERMISIVA para no romper los flujos existentes (el
 * cierre de diagnóstico open→done, el dropdown de estado del plan que permite
 * re-programar scheduled→plan, etc.): se permite CUALQUIER transición entre
 * estados NO terminales. Lo único que se bloquea es SALIR de un estado terminal
 * (done/canceled) hacia otro estado, porque revertir un evento finalizado
 * corrompe el registro — esa corrección debe hacerse vía ENMIENDA (Fase legal),
 * no revirtiendo el estado.
 */
export class ClinicalEventStateMachine {
  static isTerminal(status: ClinicalEventStatus | undefined): boolean {
    return status === "done" || status === "canceled";
  }

  static canTransition(
    from: ClinicalEventStatus | undefined,
    to: ClinicalEventStatus | undefined,
  ): boolean {
    if (!to || !from) return true; // sin cambio / estado inicial
    if (from === to) return true; // re-guardar el mismo estado
    // Bloquea únicamente la reversión desde un estado terminal.
    return !ClinicalEventStateMachine.isTerminal(from);
  }
}
