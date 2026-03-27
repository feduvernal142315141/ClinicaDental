import type {
  ClinicalEvent,
  ToothSurface,
} from "@/components/odontogram/types";
import {
  ODONTOGRAM_STATE_COLORS,
  COLOR_PRIORITY_ORDER,
  type ColorPriority,
} from "../constants/odontogram-colors.constants";
import { VISUAL_PRIORITY_TO_COLOR_PRIORITY } from "../constants/visual-priority.constants";

const VISUAL_COLOR_TO_HEX: Record<string, string> = {
  healthy: ODONTOGRAM_STATE_COLORS.HEALTHY,
  absent: ODONTOGRAM_STATE_COLORS.ABSENT,
  implant: ODONTOGRAM_STATE_COLORS.IMPLANT,
  endodontic: ODONTOGRAM_STATE_COLORS.ENDODONTIC,
  planned: ODONTOGRAM_STATE_COLORS.PLANNED,
  "planned-urgent": ODONTOGRAM_STATE_COLORS.PLANNED_URGENT,
  completed: ODONTOGRAM_STATE_COLORS.COMPLETED,
  observation: ODONTOGRAM_STATE_COLORS.OBSERVATION,
  preventive: ODONTOGRAM_STATE_COLORS.PREVENTIVE,
  crown: ODONTOGRAM_STATE_COLORS.CROWN,
};

/**
 * OdontogramColorService
 * Servicio profesional para determinar colores de dientes/superficies
 * basado en múltiples eventos clínicos con sistema de prioridades
 */
export class OdontogramColorService {
  /**
   * Determina el color de una superficie específica basado en todos los eventos clínicos
   *
   * LÓGICA:
   * 1. Filtra eventos que afectan a esta superficie
   * 2. Calcula la prioridad de cada evento
   * 3. Retorna el color del evento con mayor prioridad
   */
  static getSurfaceColor(
    toothNumber: number,
    surface: ToothSurface,
    allEvents: ClinicalEvent[],
  ): string {
    // Filtrar eventos relevantes para esta superficie
    const relevantEvents = allEvents.filter(
      (e) =>
        e.toothNumber === toothNumber &&
        e.visualState?.affectsOdontogram !== false &&
        (e.surfaces.includes(surface) ||
          e.surfaces.length === 0 ||
          e.level === "tooth"),
    );

    if (relevantEvents.length === 0) {
      return ODONTOGRAM_STATE_COLORS.HEALTHY;
    }

    // Calcular prioridad y color para cada evento
    const eventWithPriority = relevantEvents.map((event) => ({
      event,
      priority: this.getEventPriority(event),
      color: this.getEventColor(event),
    }));

    // Ordenar por prioridad (menor número = mayor prioridad)
    eventWithPriority.sort((a, b) => {
      const aPriorityIndex = COLOR_PRIORITY_ORDER.indexOf(a.priority);
      const bPriorityIndex = COLOR_PRIORITY_ORDER.indexOf(b.priority);
      return aPriorityIndex - bPriorityIndex;
    });

    // Retornar el color del evento con mayor prioridad
    return eventWithPriority[0]?.color || ODONTOGRAM_STATE_COLORS.HEALTHY;
  }

  /**
   * Determina el color base de un diente (para vista global)
   */
  static getToothColor(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): string {
    const toothEvents = allEvents.filter(
      (e) =>
        e.toothNumber === toothNumber &&
        e.visualState?.affectsOdontogram !== false,
    );

    if (toothEvents.length === 0) {
      return ODONTOGRAM_STATE_COLORS.HEALTHY;
    }

    // Buscar el evento de mayor prioridad a nivel de diente
    const eventWithPriority = toothEvents.map((event) => ({
      event,
      priority: this.getEventPriority(event),
      color: this.getEventColor(event),
    }));

    eventWithPriority.sort((a, b) => {
      const aPriorityIndex = COLOR_PRIORITY_ORDER.indexOf(a.priority);
      const bPriorityIndex = COLOR_PRIORITY_ORDER.indexOf(b.priority);
      return aPriorityIndex - bPriorityIndex;
    });

    return eventWithPriority[0]?.color || ODONTOGRAM_STATE_COLORS.HEALTHY;
  }

  /**
   * Determina la prioridad de un evento clínico
   * Esto define qué color se muestra cuando hay múltiples eventos
   */
  private static getEventPriority(event: ClinicalEvent): ColorPriority {
    const visualPriority = event.visualState?.priorityKey;
    if (visualPriority && VISUAL_PRIORITY_TO_COLOR_PRIORITY[visualPriority]) {
      return VISUAL_PRIORITY_TO_COLOR_PRIORITY[visualPriority];
    }

    // 1. AUSENTE (máxima prioridad - diente no existe)
    if (event.type === "ausente") {
      return "absent";
    }

    // 2. IMPLANTE
    if (event.type === "implante") {
      return "implant";
    }

    // 3-7. CARIES (según severidad ICDAS)
    if (
      event.type === "diagnosis" &&
      event.icdasScore &&
      event.icdasScore > 0
    ) {
      if (event.icdasScore >= 5) return "caries-urgent"; // ICDAS 5-6
      if (event.icdasScore >= 3) return "caries-active"; // ICDAS 3-4
      return "caries-initial"; // ICDAS 1-2
    }

    // 4. ENDODONCIA
    if (event.type === "endo" || event.category === "endodoncia") {
      return "endodontic";
    }

    // 6. PLANIFICADO URGENTE
    if (
      event.type === "plan" &&
      event.priority === "alta" &&
      event.status !== "done"
    ) {
      return "planned-urgent";
    }

    // 8. REALIZADO/COMPLETADO (solo eventos tipo "performed")
    if (event.type === "performed") {
      return "completed";
    }

    // 9. CORONA/PRÓTESIS (solo si está completada)
    if (event.category === "protesis" && event.status === "done") {
      return "crown";
    }

    // 10. PLANIFICADO (solo si no está marcado como "done")
    if (
      event.type === "plan" &&
      (event.status === "plan" || event.status === "in_progress")
    ) {
      return "planned";
    }

    // 10b. PLAN COMPLETADO (cuando plan.status === "done" pero aún no hay performed)
    // Esto NO debería mostrarse si ya existe un performed, pero por si acaso
    if (event.type === "plan" && event.status === "done") {
      return "completed";
    }

    // 11. OBSERVACIÓN
    if (event.status === "observation") {
      return "observation";
    }

    // 12. PREVENTIVO
    if (event.category === "preventivo") {
      return "preventive";
    }

    // 13. DEFAULT: SANO
    return "healthy";
  }

  /**
   * Determina el color específico para un evento
   */
  private static getEventColor(event: ClinicalEvent): string {
    const visualColorKey = event.visualState?.colorKey;
    if (visualColorKey && VISUAL_COLOR_TO_HEX[visualColorKey]) {
      return VISUAL_COLOR_TO_HEX[visualColorKey];
    }

    const priority = this.getEventPriority(event);

    switch (priority) {
      case "absent":
        return ODONTOGRAM_STATE_COLORS.ABSENT;

      case "implant":
        return ODONTOGRAM_STATE_COLORS.IMPLANT;

      case "caries-urgent":
        // ICDAS 5-6: Rojo intenso
        const severeScore = event.icdasScore || 5;
        return ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[severeScore as 5 | 6];

      case "caries-active":
        // ICDAS 3-4: Rojo medio
        const activeScore = event.icdasScore || 3;
        return ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[activeScore as 3 | 4];

      case "caries-initial":
        // ICDAS 1-2: Rojo claro
        const initialScore = event.icdasScore || 1;
        return ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[initialScore as 1 | 2];

      case "endodontic":
        return ODONTOGRAM_STATE_COLORS.ENDODONTIC;

      case "planned-urgent":
        return ODONTOGRAM_STATE_COLORS.PLANNED_URGENT;

      case "completed":
        // Verificar si es reciente (últimos 30 días)
        const daysSinceCompleted = this.getDaysSince(event.updatedAt);
        return daysSinceCompleted <= 30
          ? ODONTOGRAM_STATE_COLORS.COMPLETED_RECENT
          : ODONTOGRAM_STATE_COLORS.COMPLETED;

      case "crown":
        return ODONTOGRAM_STATE_COLORS.CROWN;

      case "planned":
        return ODONTOGRAM_STATE_COLORS.PLANNED;

      case "observation":
        return ODONTOGRAM_STATE_COLORS.OBSERVATION;

      case "preventive":
        return ODONTOGRAM_STATE_COLORS.PREVENTIVE;

      case "healthy":
      default:
        return ODONTOGRAM_STATE_COLORS.HEALTHY;
    }
  }

  /**
   * Obtiene todos los eventos que afectan a un diente
   * con su color y prioridad para debugging/UI
   */
  static getToothEventsSummary(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ) {
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);

    return toothEvents.map((event) => ({
      id: event.id,
      type: event.type,
      status: event.status,
      surfaces: event.surfaces,
      priority: this.getEventPriority(event),
      color: this.getEventColor(event),
      notes: event.notes,
    }));
  }

  /**
   * Helper: Calcula días desde una fecha
   */
  private static getDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Determina si un diente tiene algún diagnóstico activo
   */
  static hasActiveDiagnosis(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): boolean {
    return allEvents.some(
      (e) =>
        e.toothNumber === toothNumber &&
        e.type === "diagnosis" &&
        e.icdasScore &&
        e.icdasScore > 0,
    );
  }

  /**
   * Determina si un diente tiene tratamientos pendientes
   */
  static hasPendingTreatments(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): boolean {
    return allEvents.some(
      (e) =>
        e.toothNumber === toothNumber &&
        e.type === "plan" &&
        e.status === "plan",
    );
  }

  /**
   * Obtiene el nivel de urgencia de un diente basado en todos sus eventos
   */
  static getToothUrgency(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): "none" | "low" | "medium" | "high" | "emergency" {
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);

    const urgencyOrder: Array<
      "none" | "low" | "medium" | "high" | "emergency"
    > = ["none", "low", "medium", "high", "emergency"];
    const declaredUrgency = toothEvents
      .map((event) => event.automationHints?.urgencyLevel)
      .filter(Boolean)
      .sort((a, b) => urgencyOrder.indexOf(b!) - urgencyOrder.indexOf(a!))[0];

    if (declaredUrgency) {
      return declaredUrgency;
    }

    // Emergencia: ICDAS 6 o prioridad alta + dolor
    const hasEmergency = toothEvents.some(
      (e) =>
        e.icdasScore === 6 ||
        (e.priority === "alta" && e.notes?.toLowerCase().includes("dolor")),
    );
    if (hasEmergency) return "emergency";

    // Alto: ICDAS 5 o endodoncia necesaria
    const hasHigh = toothEvents.some(
      (e) => e.icdasScore === 5 || e.type === "endo",
    );
    if (hasHigh) return "high";

    // Medio: ICDAS 3-4
    const hasMedium = toothEvents.some(
      (e) => e.icdasScore && e.icdasScore >= 3,
    );
    if (hasMedium) return "medium";

    // Bajo: ICDAS 1-2 o observación
    const hasLow = toothEvents.some(
      (e) => (e.icdasScore && e.icdasScore > 0) || e.status === "observation",
    );
    if (hasLow) return "low";

    return "none";
  }
}
