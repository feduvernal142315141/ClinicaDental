import type {
  OdontogramDictationAction,
  OdontogramDictationMatch,
  OdontogramDictationOperation,
  OdontogramDictationPatchResponse,
  OdontogramDictationSurface,
  OdontogramDictationSurfaceDiagnosis,
  OdontogramDictationTarget,
  OdontogramDictationToothDiagnosis,
  OdontogramDictationVitalityTest,
} from "@/lib/entity/speech";
import { migrateGlobalStatus } from "@/lib/odontogram/store";
import {
  GLOBAL_STATUS_LABELS,
  ICDAS_LABELS,
  NON_CARIOUS_LESION_LABELS,
  PERIAPICAL_STATUS_LABELS,
  PULPAL_STATUS_LABELS,
  VITALITY_TEST_LABELS,
} from "@/lib/odontogram/domain/odontogram/constants";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services";
import type {
  ICDASScore,
  ToothSurface,
} from "@/lib/odontogram/domain/odontogram/types";

/**
 * Traducción de un parche de dictado a CASTELLANO CLÍNICO, para poder
 * previsualizarlo antes de aplicarlo (reglas 1–3 de «Reglas para el frontend»
 * en `ODONTOGRAM_DICTATION_API.md`: previsualizar, ordenar globalmente por
 * `sequence`, agrupar por `toothNumber`).
 *
 * Módulo PURO: no lee ni escribe el store, no conoce al host y no renderiza.
 * Vive aquí, y no en el panel, porque el vocabulario clínico es del dominio del
 * odontograma; el panel solo pinta lo que este módulo decide que se dice.
 *
 * NINGUNA etiqueta se inventa aquí: todas salen del vocabulario que la UI del
 * odontograma ya usa (`ToothTypeService.getSurfaceLabel` para las caras,
 * `ICDAS_LABELS`, `GLOBAL_STATUS_LABELS`, `PULPAL_STATUS_LABELS`,
 * `PERIAPICAL_STATUS_LABELS`, `VITALITY_TEST_LABELS`,
 * `NON_CARIOUS_LESION_LABELS`, y los rótulos de campo de `diagnosis-tab`).
 * Dos vocabularios distintos para lo mismo confunden más que ninguno.
 */

/**
 * Superficie del contrato de dictado → celda del store.
 *
 * Los códigos precisos de schema v3 pasan sin pérdida. `mesial`/`distal` siguen
 * traducidos porque el contrato los conserva para respuestas antiguas.
 *
 * Vive en este fichero (y no junto al aplicador) porque lo necesitan las dos
 * capas — describir la operación y aplicarla — y la descripción no puede
 * depender del aplicador sin crear un ciclo de imports.
 */
export const PATCH_TO_STORE_SURFACE: Record<
  OdontogramDictationSurface,
  ToothSurface
> = {
  mesial: "mesialOclusal",
  distal: "distalOclusal",
  mesialVestibular: "mesialVestibular",
  mesialOclusal: "mesialOclusal",
  mesialLingual: "mesialLingual",
  distalVestibular: "distalVestibular",
  distalOclusal: "distalOclusal",
  distalLingual: "distalLingual",
  facial: "facial",
  facialOclusal: "facialOclusal",
  lingual: "lingual",
  lingualOclusal: "lingualOclusal",
  oclusal: "oclusal",
  cervicalVestibular: "cervicalVestibular",
  cervicalLingual: "cervicalLingual",
};

/** Una operación con la pieza a la que pertenece, ya desanidada del parche. */
export interface OdontogramDictationOperationEntry {
  toothNumber: number;
  operation: OdontogramDictationOperation;
}

/**
 * Operaciones del parche desanidadas y ordenadas GLOBALMENTE por `sequence`
 * (regla 2 del contrato). Es el orden en el que se aplican y el orden en el que
 * se deben leer: el dictado es una frase, no un conjunto.
 */
export function listOdontogramDictationOperations(
  patch: OdontogramDictationPatchResponse,
): OdontogramDictationOperationEntry[] {
  return patch.toothChanges
    .flatMap((change) =>
      change.operations.map((operation) => ({
        toothNumber: change.toothNumber,
        operation,
      })),
    )
    .sort((left, right) => left.operation.sequence - right.operation.sequence);
}

/** Qué hace la operación, en términos del odontograma. */
export type OdontogramDictationOperationKind =
  | "add-surface-finding"
  | "remove-surface-finding"
  | "set-tooth-diagnosis"
  | "remove-tooth-diagnosis"
  | "set-global-status"
  | "reset-global-status"
  | "unsupported";

export interface OdontogramDictationSurfaceLabel {
  /** Celda del store (dato, no texto). */
  surface: ToothSurface;
  /** Abreviatura clínica: `M·O`, `V`, `C·P`… */
  short: string;
  /** Nombre completo: `Mesio-vestibular`, `Cervical palatino`… */
  full: string;
}

export interface OdontogramDictationOperationDescription {
  /**
   * Clave estable de la operación DENTRO de este parche. El validador del
   * backend (`OdontogramPatchOutputValidator`) exige que sea positiva, no
   * repetida y consecutiva desde 1, así que identifica la operación sin
   * ambigüedad mientras el parche sea el mismo.
   */
  sequence: number;
  toothNumber: number;
  /** `Diente 16`, tal y como lo nombra el modal del diente. */
  toothLabel: string;
  kind: OdontogramDictationOperationKind;
  action: OdontogramDictationAction;
  target: OdontogramDictationTarget;
  /** Verbo en infinitivo: `Añadir hallazgo`, `Quitar hallazgo`… */
  actionLabel: string;
  /**
   * Titular de una línea, SIN nombrar la pieza: la cabecera del grupo ya la
   * nombra y repetirla en cada fila es ruido.
   */
  summary: string;
  /**
   * `REMOVE` o `RESET`: borra o revierte algo ya registrado. El panel las tiene
   * que distinguir — es la diferencia entre añadir un dato y perder uno.
   */
  destructive: boolean;
  surfaces: OdontogramDictationSurfaceLabel[];
  /** Caras en abreviatura, ya unidas: `M·O, O`. Vacío si la operación no tiene caras. */
  surfacesLabel: string;
  /** Detalle clínico en chips: ICDAS, actividad, lesión no cariosa, pulpa… */
  details: string[];
  /**
   * Fragmento de lo que se oyó que originó la operación.
   *
   * Es el único dato que permite al doctor reconocer que esa frase la dijo el
   * paciente o alguien que pasaba, y no él: el micrófono está abierto en el box
   * y la voz no se puede autenticar.
   */
  sourceText: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export interface OdontogramDictationToothGroup {
  toothNumber: number;
  toothLabel: string;
  /** Operaciones de esta pieza, en orden global de `sequence`. */
  operations: OdontogramDictationOperationDescription[];
  destructiveCount: number;
}

export interface OdontogramDictationPatchDescription {
  /** Todas las operaciones, en orden global de `sequence`. */
  operations: OdontogramDictationOperationDescription[];
  /** Las mismas, agrupadas por pieza; el grupo se ordena por su primer `sequence`. */
  groups: OdontogramDictationToothGroup[];
  totalOperations: number;
  destructiveCount: number;
  /** `sequence` de todas las operaciones: selección inicial «todo marcado». */
  sequences: number[];
}

const ACTION_LABELS: Record<OdontogramDictationOperationKind, string> = {
  "add-surface-finding": "Añadir hallazgo",
  "remove-surface-finding": "Quitar hallazgo",
  "set-tooth-diagnosis": "Registrar diagnóstico integral",
  "remove-tooth-diagnosis": "Quitar diagnóstico integral",
  "set-global-status": "Fijar estado de la pieza",
  "reset-global-status": "Restaurar estado de la pieza",
  unsupported: "Instrucción no compatible",
};

const FINDING_KIND_LABELS: Record<
  OdontogramDictationSurfaceDiagnosis["findingKind"],
  string
> = {
  caries: "Caries",
  "non-carious-lesion": "Lesión no cariosa",
  // `SURFACE_STATUS_LABELS.healthy` ya llama "Sin hallazgo" a la cara sobre la
  // que no se ha afirmado nada; el paréntesis dice por qué se registra igual.
  "support-only": "Sin hallazgo (solo soporte)",
};

const CARIES_TYPE_LABELS: Record<"coronal" | "radicular", string> = {
  coronal: "Coronal",
  radicular: "Radicular",
};

const CARIES_ACTIVITY_LABELS: Record<
  "activa" | "inactiva" | "no-aplica",
  string
> = {
  activa: "Activa",
  inactiva: "Inactiva",
  "no-aplica": "No aplica",
};

const VITALITY_RESULT_LABELS: Record<
  OdontogramDictationVitalityTest["result"],
  string
> = {
  positivo: "Positivo",
  negativo: "Negativo",
  "no-realizado": "No realizado",
};

/** Escala Wong-Baker del `diagnosis-tab`, resuelta también para valores impares. */
function painLabel(score: number): string {
  if (score <= 0) return "Sin dolor";
  if (score <= 2) return "Leve";
  if (score <= 4) return "Moderado";
  if (score <= 6) return "Considerable";
  if (score <= 8) return "Severo";
  return "Insoportable";
}

function toothLabelOf(toothNumber: number): string {
  return `Diente ${toothNumber}`;
}

function describeSurfaces(
  toothNumber: number,
  operation: OdontogramDictationOperation,
): OdontogramDictationSurfaceLabel[] {
  if (!operation.surfaces?.length) return [];
  // Deduplicado tras la traducción: `mesial` y `mesialOclusal` son la misma celda.
  const cells = Array.from(
    new Set(
      operation.surfaces.map((surface) => PATCH_TO_STORE_SURFACE[surface]),
    ),
  ).filter((cell): cell is ToothSurface => !!cell);

  return cells.map((surface) => ({
    surface,
    ...ToothTypeService.getSurfaceLabel(toothNumber, surface),
  }));
}

function icdasDetail(score: ICDASScore, source?: string): string[] {
  const detail = `ICDAS ${ICDAS_LABELS[score]}`;
  return source === "dictation-default"
    ? [detail, "ICDAS asignado por defecto (no se dictó el valor)"]
    : [detail];
}

function surfaceDiagnosisDetails(
  diagnosis: OdontogramDictationSurfaceDiagnosis,
): string[] {
  const details: string[] = [FINDING_KIND_LABELS[diagnosis.findingKind]];

  if (diagnosis.icdasScore !== undefined) {
    details.push(...icdasDetail(diagnosis.icdasScore, diagnosis.icdasSource));
  }
  if (diagnosis.cariesType) {
    details.push(`Tipo de caries: ${CARIES_TYPE_LABELS[diagnosis.cariesType]}`);
  }
  if (diagnosis.cariesActivity) {
    details.push(
      `Actividad: ${CARIES_ACTIVITY_LABELS[diagnosis.cariesActivity]}`,
    );
  }
  if (diagnosis.nonCariousLesions?.length) {
    details.push(
      `Lesiones no cariosas: ${diagnosis.nonCariousLesions
        .map((lesion) => NON_CARIOUS_LESION_LABELS[lesion])
        .join(", ")}`,
    );
  }
  if (diagnosis.visualImpact === "tooth") {
    details.push("Afecta a toda la pieza");
  }
  if (diagnosis.visualImpact === "none") {
    details.push("No se pinta en el odontograma");
  }
  if (diagnosis.notes) {
    details.push(`Notas breves: ${diagnosis.notes}`);
  }
  return details;
}

/** Qué se busca para borrarlo. Sin esto, un `REMOVE` es un cheque en blanco. */
function matchDetails(match: OdontogramDictationMatch | undefined): string[] {
  if (!match) return ["Sin filtro: afecta al hallazgo registrado en esas caras"];

  const details: string[] = [];
  if (match.findingKind) details.push(FINDING_KIND_LABELS[match.findingKind]);
  if (match.icdasScore !== undefined) {
    details.push(`ICDAS ${ICDAS_LABELS[match.icdasScore]}`);
  }
  if (match.cariesType) {
    details.push(`Tipo de caries: ${CARIES_TYPE_LABELS[match.cariesType]}`);
  }
  if (match.cariesActivity) {
    details.push(`Actividad: ${CARIES_ACTIVITY_LABELS[match.cariesActivity]}`);
  }
  if (match.nonCariousLesions?.length) {
    details.push(
      `Lesiones no cariosas: ${match.nonCariousLesions
        .map((lesion) => NON_CARIOUS_LESION_LABELS[lesion])
        .join(", ")}`,
    );
  }
  if (match.pulpalStatus) {
    details.push(`Estado pulpar: ${PULPAL_STATUS_LABELS[match.pulpalStatus]}`);
  }
  if (match.periapicalStatus) {
    details.push(
      `Estado periapical: ${PERIAPICAL_STATUS_LABELS[match.periapicalStatus]}`,
    );
  }
  if (match.vitalityTestType) {
    details.push(
      `Prueba de vitalidad: ${VITALITY_TEST_LABELS[match.vitalityTestType]}`,
    );
  }
  return details.length > 0
    ? details
    : ["Sin filtro: afecta al hallazgo registrado en esas caras"];
}

function toothDiagnosisDetails(
  input: OdontogramDictationToothDiagnosis,
): string[] {
  const details: string[] = [];
  if (input.pulpalStatus) {
    details.push(`Estado pulpar: ${PULPAL_STATUS_LABELS[input.pulpalStatus]}`);
  }
  if (input.periapicalStatus) {
    details.push(
      `Estado periapical: ${PERIAPICAL_STATUS_LABELS[input.periapicalStatus]}`,
    );
  }
  input.vitalityTests?.forEach((test) => {
    details.push(
      `${VITALITY_TEST_LABELS[test.type]}: ${VITALITY_RESULT_LABELS[test.result]}`,
    );
  });
  if (input.painScore !== undefined) {
    details.push(`Dolor ${input.painScore}/10 — ${painLabel(input.painScore)}`);
  }
  if (input.painDescription) {
    details.push(`Descripción del dolor: ${input.painDescription}`);
  }
  if (input.generalNotes) {
    details.push(`Notas: ${input.generalNotes}`);
  }
  return details;
}

function globalStatusLabel(value: string | undefined): string | null {
  const status = migrateGlobalStatus(value);
  return status ? GLOBAL_STATUS_LABELS[status] : null;
}

/**
 * Describe UNA operación del parche. Función pura: mismos argumentos, mismo
 * texto; no consulta el store ni la fecha.
 */
export function describeOdontogramDictationOperation(
  toothNumber: number,
  operation: OdontogramDictationOperation,
): OdontogramDictationOperationDescription {
  const surfaces = describeSurfaces(toothNumber, operation);
  const surfacesLabel = surfaces.map((surface) => surface.short).join(", ");
  const destructive =
    operation.action === "REMOVE" || operation.action === "RESET";

  let kind: OdontogramDictationOperationKind = "unsupported";
  let summary = `El dictado pidió «${operation.action} ${operation.target}», que el odontograma no sabe aplicar.`;
  let details: string[] = [];

  switch (`${operation.action}:${operation.target}`) {
    case "UPSERT:SURFACE_DIAGNOSIS": {
      kind = "add-surface-finding";
      details = operation.diagnosis
        ? surfaceDiagnosisDetails(operation.diagnosis)
        : ["Falta el detalle del hallazgo"];
      const finding = operation.diagnosis
        ? FINDING_KIND_LABELS[operation.diagnosis.findingKind]
        : "Hallazgo de superficie";
      summary = surfacesLabel ? `${finding} en ${surfacesLabel}` : finding;
      break;
    }
    case "REMOVE:SURFACE_DIAGNOSIS": {
      kind = "remove-surface-finding";
      details = matchDetails(operation.match);
      summary = surfacesLabel
        ? `Quitar el hallazgo de ${surfacesLabel}`
        : "Quitar el hallazgo de superficie";
      break;
    }
    case "UPSERT:TOOTH_DIAGNOSIS": {
      kind = "set-tooth-diagnosis";
      details = operation.toothDiagnosis
        ? toothDiagnosisDetails(operation.toothDiagnosis)
        : ["Falta el detalle del diagnóstico integral"];
      summary = "Diagnóstico integral de la pieza";
      break;
    }
    case "REMOVE:TOOTH_DIAGNOSIS": {
      kind = "remove-tooth-diagnosis";
      details = matchDetails(operation.match);
      summary = "Quitar el diagnóstico integral de la pieza";
      break;
    }
    case "SET:TOOTH_GLOBAL_STATUS": {
      kind = "set-global-status";
      const label = globalStatusLabel(operation.value);
      details = label ? [label] : ["Estado dental no reconocido"];
      summary = label
        ? `Estado de la pieza: ${label}`
        : "Estado de la pieza no reconocido";
      break;
    }
    case "RESET:TOOTH_GLOBAL_STATUS": {
      kind = "reset-global-status";
      const label = globalStatusLabel(operation.value) ?? GLOBAL_STATUS_LABELS.healthy;
      details = [label];
      summary = `Restaurar la pieza a ${label}`;
      break;
    }
    default:
      break;
  }

  return {
    sequence: operation.sequence,
    toothNumber,
    toothLabel: toothLabelOf(toothNumber),
    kind,
    action: operation.action,
    target: operation.target,
    actionLabel: ACTION_LABELS[kind],
    summary,
    destructive,
    surfaces,
    surfacesLabel,
    details,
    sourceText: operation.sourceText,
    confidence: operation.confidence,
    requiresConfirmation: operation.requiresConfirmation,
  };
}

/**
 * Describe el parche entero: lista ordenada por `sequence` y la misma lista
 * agrupada por pieza, que es exactamente lo que pide el contrato para la
 * previsualización.
 */
export function describeOdontogramDictationPatch(
  patch: OdontogramDictationPatchResponse,
): OdontogramDictationPatchDescription {
  const operations = listOdontogramDictationOperations(patch).map(
    ({ toothNumber, operation }) =>
      describeOdontogramDictationOperation(toothNumber, operation),
  );

  // El grupo conserva el orden de aparición de su PRIMERA operación: agrupar no
  // puede reordenar el relato del dictado.
  const groups: OdontogramDictationToothGroup[] = [];
  const groupsByTooth = new Map<number, OdontogramDictationToothGroup>();
  operations.forEach((description) => {
    let group = groupsByTooth.get(description.toothNumber);
    if (!group) {
      group = {
        toothNumber: description.toothNumber,
        toothLabel: description.toothLabel,
        operations: [],
        destructiveCount: 0,
      };
      groupsByTooth.set(description.toothNumber, group);
      groups.push(group);
    }
    group.operations.push(description);
    if (description.destructive) group.destructiveCount += 1;
  });

  return {
    operations,
    groups,
    totalOperations: operations.length,
    destructiveCount: operations.filter((item) => item.destructive).length,
    sequences: operations.map((item) => item.sequence),
  };
}
