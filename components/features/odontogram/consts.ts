export type ToothStatus = "sano" | "caries" | "filled" | "falta" | "implante";
export type ToothType = "incisor" | "canine" | "premolar" | "molar";

// NUEVO: variantes anatómicas por pieza/arcada
export type ToothVariant =
  | "U_CI"
  | "U_LI"
  | "U_CAN"
  | "U_P1"
  | "U_P2"
  | "U_M1"
  | "U_M2"
  | "U_M3"
  | "L_CI"
  | "L_LI"
  | "L_CAN"
  | "L_P1"
  | "L_P2"
  | "L_M1"
  | "L_M2"
  | "L_M3";

export type ToothInfo = {
  id: string; // FDI (p. ej. "11", "26", "31")
  type: ToothType;
  arch: "upper" | "lower";
  quadrant: 1 | 2 | 3 | 4;
  mirror?: boolean; // para espejar lado izquierdo
  variant: ToothVariant; // NUEVO
};

export const STATUS_COLOR: Record<ToothStatus, string> = {
  sano: "#86efac",
  caries: "#f87171",
  filled: "#60a5fa",
  falta: "#9ca3af",
  implante: "#f59e0b",
};

// Órdenes FDI para dibujar en arco
export const FDI_ORDER_UPPER: string[] = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];

export const FDI_ORDER_LOWER: string[] = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];

function toothTypeFromFDI(n: number): ToothType {
  const pos = n % 10; // 1..8
  if (pos === 1 || pos === 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos === 4 || pos === 5) return "premolar";
  return "molar"; // 6,7,8
}

// NUEVO: asigna variante anatómica por arcada/posición
function variantFromFDI(id: string): ToothVariant {
  const arch = id[0] === "1" || id[0] === "2" ? "U" : "L";
  const pos = parseInt(id[1], 10); // 1..8
  const mapU = [
    "U_CI",
    "U_LI",
    "U_CAN",
    "U_P1",
    "U_P2",
    "U_M1",
    "U_M2",
    "U_M3",
  ] as const;
  const mapL = [
    "L_CI",
    "L_LI",
    "L_CAN",
    "L_P1",
    "L_P2",
    "L_M1",
    "L_M2",
    "L_M3",
  ] as const;
  return (arch === "U" ? mapU[pos - 1] : mapL[pos - 1]) as ToothVariant;
}

export const TEETH_MAP: ToothInfo[] = [
  ...FDI_ORDER_UPPER.map((id) => {
    const q = parseInt(id[0], 10) as 1 | 2;
    const arch = "upper" as const;
    return {
      id,
      type: toothTypeFromFDI(parseInt(id, 10)),
      arch,
      quadrant: q,
      mirror: id.startsWith("2"),
      variant: variantFromFDI(id),
    };
  }),
  ...FDI_ORDER_LOWER.map((id) => {
    const q = parseInt(id[0], 10) as 3 | 4;
    const arch = "lower" as const;
    return {
      id,
      type: toothTypeFromFDI(parseInt(id, 10)),
      arch,
      quadrant: q,
      mirror: id.startsWith("3"),
      variant: variantFromFDI(id),
    };
  }),
];
