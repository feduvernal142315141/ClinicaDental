// Fuente única de rangos FDI, conjuntos de dientes, filas por cuadrante,
// proxy de arte y regla de edad. Sin imports: lo consumen la preview de
// ajustes y los pickers sin arrastrar el store.

export type DentitionType = "primary" | "mixed" | "permanent";

export const DENTITION_TYPES = ["primary", "mixed", "permanent"] as const;

export const DEFAULT_DENTITION: DentitionType = "permanent";

export function isDentitionType(value: unknown): value is DentitionType {
  return (
    typeof value === "string" &&
    (DENTITION_TYPES as readonly string[]).includes(value)
  );
}

export interface DentitionCatalogEntry {
  value: DentitionType;
  label: string;
  description: string;
  ageHint: string;
}

export const DENTITION_CATALOG: readonly DentitionCatalogEntry[] = [
  {
    value: "primary",
    label: "Dentición temporal",
    description: "20 piezas (51–85)",
    ageHint: "Hasta ~5 años",
  },
  {
    value: "mixed",
    label: "Dentición mixta",
    description: "52 espacios, temporales y permanentes",
    ageHint: "~6–12 años",
  },
  {
    value: "permanent",
    label: "Dentición permanente",
    description: "32 piezas (11–48)",
    ageHint: "Desde ~13 años",
  },
];

export type QuadrantRows = Readonly<
  Record<"upperRight" | "upperLeft" | "lowerLeft" | "lowerRight", readonly number[]>
>;

export const PERMANENT_ROWS: QuadrantRows = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
};

export const PRIMARY_ROWS: QuadrantRows = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81],
};

function quadrantOf(fdi: number): number {
  return Math.floor(fdi / 10);
}

function positionOf(fdi: number): number {
  return fdi % 10;
}

export function isPermanentFdi(fdi: number): boolean {
  if (!Number.isInteger(fdi)) return false;
  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);
  return quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
}

export function isPrimaryFdi(fdi: number): boolean {
  if (!Number.isInteger(fdi)) return false;
  const quadrant = quadrantOf(fdi);
  const position = positionOf(fdi);
  return quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
}

export interface DentitionRowSet {
  rows: QuadrantRows;
  primary: boolean;
}

const PERMANENT_ROW_SET: DentitionRowSet = {
  rows: PERMANENT_ROWS,
  primary: false,
};
const PRIMARY_ROW_SET: DentitionRowSet = { rows: PRIMARY_ROWS, primary: true };

// Orden exterior→interior: en mixta los permanentes envuelven a los temporales.
export function quadrantRowsFor(
  dentition: DentitionType,
): readonly DentitionRowSet[] {
  if (dentition === "primary") return [PRIMARY_ROW_SET];
  if (dentition === "mixed") return [PERMANENT_ROW_SET, PRIMARY_ROW_SET];
  return [PERMANENT_ROW_SET];
}

export function teethFor(dentition: DentitionType): number[] {
  const teeth: number[] = [];
  for (const rowSet of quadrantRowsFor(dentition)) {
    teeth.push(
      ...rowSet.rows.upperRight,
      ...rowSet.rows.upperLeft,
      ...rowSet.rows.lowerLeft,
      ...rowSet.rows.lowerRight,
    );
  }
  return teeth;
}

// Proxy de arte: el temporal se dibuja con el SVG de su homólogo permanente
// (51→11, 55→15) hasta que exista arte propio de dentición temporal.
export function permanentProxyOf(fdi: number): number {
  return isPrimaryFdi(fdi) ? fdi - 40 : fdi;
}

export function dentitionForAge(
  years: number | null | undefined,
): DentitionType {
  if (years === null || years === undefined) return "permanent";
  if (years < 6) return "primary";
  if (years <= 12) return "mixed";
  return "permanent";
}
