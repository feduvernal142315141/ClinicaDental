import type { ToothGlobalStatus, ToothCondition } from "../types/tooth.types";

/**
 * Eje pendiente/realizado del odontograma. Es la regla que da sentido a todo el
 * código de color: ROJO = requiere tratamiento, AZUL = tratamiento realizado o
 * hallazgo ya consolidado. `neutral` queda para lo que no admite ese eje.
 */
export type ToothStatusTone =
  | "healthy"
  | "pending"
  | "done"
  | "neutral"
  | "implant";

export interface ToothStatusMeta {
  label: string;
  /** Qué significa, en la lengua del clínico. Alimenta el `title` del chip. */
  description: string;
  tone: ToothStatusTone;
  /** Color del símbolo/relleno en el SVG y en la leyenda. */
  color: string;
}

/** Paleta del eje, en un solo sitio. */
const TONE_COLORS: Record<ToothStatusTone, string> = {
  healthy: "#10B981", // verde
  pending: "#D32F2F", // rojo — por hacer
  done: "#2563EB", // azul — realizado
  neutral: "#1F2937", // ink
  implant: "#8B5CF6", // morado
};

/**
 * Tabla ÚNICA de estados globales de la pieza: etiqueta, descripción, eje y
 * color. Antes esto vivía repartido en tres sitios (dos ficheros de constantes
 * casi idénticos y dos `Record` declarados dentro del cuerpo de `ToothModal`),
 * que es exactamente cómo "Ausente (pend.)" acabó siendo azul y "Ausente
 * (hecha)" roja, al revés de la convención.
 */
export const GLOBAL_STATUS_META: Record<ToothGlobalStatus, ToothStatusMeta> = {
  healthy: {
    label: "Sano",
    description: "Pieza sin tratamientos mayores registrados",
    tone: "healthy",
    color: TONE_COLORS.healthy,
  },
  extraction_indicated: {
    label: "Extracción indicada",
    description: "La pieza sigue en boca y está indicada su exodoncia (✕ roja)",
    tone: "pending",
    color: TONE_COLORS.pending,
  },
  absent: {
    label: "Ausente",
    description: "La pieza no está en boca: extraída o agenesia (✕ azul)",
    tone: "done",
    color: TONE_COLORS.done,
  },
  endodontic: {
    label: "Endodoncia",
    description: "Tratamiento endodóntico registrado (ENDO)",
    tone: "neutral",
    color: TONE_COLORS.neutral,
  },
  crown_pending: {
    label: "Corona (por hacer)",
    description: "Corona o prótesis fija indicada (anillo rojo)",
    tone: "pending",
    color: TONE_COLORS.pending,
  },
  crown_done: {
    label: "Corona (hecha)",
    description: "Corona o prótesis fija ya colocada (anillo azul)",
    tone: "done",
    color: TONE_COLORS.done,
  },
  implant: {
    label: "Implante",
    description: "Implante dental",
    tone: "implant",
    color: TONE_COLORS.implant,
  },
};

/** Orden de presentación de los chips: hallazgo → tratamientos → implante. */
export const GLOBAL_STATUS_ORDER: ToothGlobalStatus[] = [
  "healthy",
  "extraction_indicated",
  "absent",
  "endodontic",
  "crown_pending",
  "crown_done",
  "implant",
];

export const GLOBAL_STATUS_LABELS: Record<ToothGlobalStatus, string> =
  Object.fromEntries(
    Object.entries(GLOBAL_STATUS_META).map(([key, meta]) => [key, meta.label]),
  ) as Record<ToothGlobalStatus, string>;

// Colores usados SOLO en chips/leyenda (no en el SVG del diente).
export const GLOBAL_STATUS_COLORS: Record<ToothGlobalStatus, string> =
  Object.fromEntries(
    Object.entries(GLOBAL_STATUS_META).map(([key, meta]) => [key, meta.color]),
  ) as Record<ToothGlobalStatus, string>;

/** Piezas que no están en boca: sus superficies no admiten diagnóstico. */
export function isToothPhysicallyAbsent(status: ToothGlobalStatus): boolean {
  return status === "absent" || status === "implant";
}

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  healthy: "#10B981",
  caries: "#DC2626",
  fracture: "#7C3AED",
  wear: "#F59E0B",
  stain: "#8B5CF6",
  calculus: "#78716C",
};

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  healthy: "Sano",
  caries: "Caries",
  fracture: "Fractura",
  wear: "Desgaste",
  stain: "Tinción",
  calculus: "Cálculo",
};
