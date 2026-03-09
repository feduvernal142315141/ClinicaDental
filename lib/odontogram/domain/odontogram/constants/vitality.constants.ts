import type { VitalityTestType, PulpalStatus, PeriapicalStatus, NonCariousLesion } from "../types"

export const PULPAL_STATUS_LABELS: Record<PulpalStatus, string> = {
  normal: "Normal",
  reversible: "Pulpitis Reversible",
  irreversible: "Pulpitis Irreversible",
  necrosis: "Necrosis Pulpar",
  observacion: "En Observación",
}

export const PERIAPICAL_STATUS_LABELS: Record<PeriapicalStatus, string> = {
  normal: "Normal",
  "periodontitis-apical": "Periodontitis Apical",
  absceso: "Absceso",
  quiste: "Quiste",
}

export const NON_CARIOUS_LESION_LABELS: Record<NonCariousLesion, string> = {
  atricion: "Atrición",
  abrasion: "Abrasión",
  erosion: "Erosión",
  hipoplasia: "Hipoplasia/Fluorosis",
  fisura: "Fisuras",
  fractura: "Fractura",
}

export const VITALITY_TEST_LABELS: Record<VitalityTestType, string> = {
  frio: "Frío",
  calor: "Calor",
  ept: "EPT",
  percusion: "Percusión",
  palpacion: "Palpación",
}
