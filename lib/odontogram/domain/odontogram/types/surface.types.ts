/**
 * Vocabulario de superficies dentales del odontograma.
 *
 * ── POR QUÉ CADA VISTA TIENE SU PROPIO CÓDIGO ────────────────────────────────
 * Las tres zonas que antes se llamaban todas "mesial" NO son la misma estructura
 * vista desde tres ángulos: son tres estructuras distintas mal nombradas igual.
 * La mesial vista desde VESTIBULAR es el ángulo línea mesio-vestibular (una
 * superficie libre); la mesial vista desde OCLUSAL es el reborde marginal mesial
 * con su punto de contacto (Clase II de G.V. Black); la mesial vista desde
 * PALATINO/LINGUAL es el ángulo línea mesio-palatino. Distinta etiología,
 * distinta clase, distinto tratamiento — el periodontograma estándar de 6 puntos
 * (MB, B, DB, ML, L, DL) ya trata los ángulos línea como sitios independientes.
 * Que marcar una marcara las tres era el error.
 *
 * Es EXACTAMENTE el mismo razonamiento que ya llevó a desdoblar el tercio
 * cervical en `cervicalVestibular` / `cervicalLingual` (Clase V bucal vs Clase V
 * palatina son dos lesiones distintas). Este contrato extiende ese precedente al
 * resto de zonas; no inventa un mecanismo nuevo.
 *
 * ── REGLA DE NOMBRADO (una sola) ─────────────────────────────────────────────
 * El sufijo nombra la VISTA desde la que se observa la superficie, y se OMITE
 * cuando la vista coincide con el nombre de la cara:
 *   - no existe una vista "mesial" ni "distal" → todas sus celdas llevan sufijo;
 *   - la vista vestibular ES la cara vestibular → el cuerpo bucal es `facial`;
 *   - la vista lateral ES la cara palatina/lingual → el cuerpo es `lingual`;
 *   - la vista oclusal ES la mesa → la mesa es `oclusal`;
 *   - no existe una vista "cervical" → las dos cervicales llevan sufijo (lo que
 *     ya había: la regla es retro-compatible con el precedente).
 * Sufijos permitidos: `Vestibular`, `Oclusal`, `Lingual`. `Lingual` cubre ambas
 * arcadas: palatino vs lingual es decisión de PRESENTACIÓN (por arcada, en
 * `ToothTypeService.getSurfaceLabel`), igual que ya ocurre con `cervicalLingual`.
 *
 * ── DOS NIVELES ──────────────────────────────────────────────────────────────
 * Nivel 1 — la celda `(vista, zona)`: los 13 códigos de `PAINTABLE_SURFACES`. Es
 * lo ÚNICO que se marca, se pinta, se diagnostica y se almacena.
 * Nivel 2 — la superficie canónica ADA/CDT (`CanonicalSurface`): se DERIVA con
 * `projectToCanonicalSurface` y NUNCA se persiste. Es el vocabulario de
 * catálogos, plantillas, reglas clínicas, resúmenes tipo `MOD`, conteos y
 * facturación. No existe estándar internacional que cualifique la superficie por
 * vista (ADA reconoce 5: M, D, O/I, L, F/B), así que la celda es interna del
 * producto y se proyecta al salir. Precedente de industria: la casilla V
 * (Clase V) de Open Dental se dibuja aparte y se convierte a B/F al facturar.
 */
export type ToothSurface =
  // ── Proximal mesial: 3 celdas independientes (una por vista) ──────────────
  /** Ángulo línea mesio-vestibular (superficie libre). Vista vestibular. */
  | "mesialVestibular"
  /**
   * CELDA PROXIMAL CANÓNICA mesial: reborde marginal + punto de contacto
   * (Clase II). Vista oclusal. Las reglas clínicas proximales se anclan AQUÍ,
   * no en la familia mesial completa: proponer infiltración proximal sobre una
   * lesión `mesialVestibular` (que es superficie libre) sería un error clínico.
   */
  | "mesialOclusal"
  /** Ángulo línea mesio-palatino / mesio-lingual. Vista lateral. */
  | "mesialLingual"
  // ── Proximal distal: idéntico razonamiento ────────────────────────────────
  /** Ángulo línea disto-vestibular (superficie libre). Vista vestibular. */
  | "distalVestibular"
  /** CELDA PROXIMAL CANÓNICA distal: reborde marginal + punto de contacto. */
  | "distalOclusal"
  /** Ángulo línea disto-palatino / disto-lingual. Vista lateral. */
  | "distalLingual"
  // ── Cara vestibular ───────────────────────────────────────────────────────
  /** Cuerpo bucal/labial visto de frente. Cara canónica de la vista vestibular. */
  | "facial"
  /** Vertiente (banda) vestibular vista desde oclusal — solo se ve por el eje largo. */
  | "facialOclusal"
  // ── Cara palatina / lingual ───────────────────────────────────────────────
  /**
   * Cuerpo palatino/lingual visto de lado (cíngulo y fosa palatina en
   * anteriores). Cara canónica de la vista lateral.
   */
  | "lingual"
  /** Vertiente (banda) palatina/lingual vista desde oclusal. */
  | "lingualOclusal"
  // ── Mesa oclusal / borde incisal ──────────────────────────────────────────
  /**
   * Mesa oclusal (posteriores) o borde incisal (anteriores). ÚNICO código que NO
   * se cualifica por vista, a propósito: el borde incisal es UNA sola lámina de
   * esmalte, verla de frente o desde palatino no la convierte en dos sitios.
   * Desdoblarla generaría falsos negativos en atrición y fractura incisal. En
   * posteriores la mesa solo existe en la vista oclusal, así que ahí nunca hubo
   * nada que separar. Consecuencia aceptada: en anteriores es UNA celda dibujada
   * en las tres vistas (no tres celdas acopladas).
   */
  | "oclusal"
  // ── Tercio cervical (G.V. Black Clase V) — el precedente ──────────────────
  /** Tercio cervical bucal (Clase V bucal). Solo existe en la vista vestibular. */
  | "cervicalVestibular"
  /** Tercio cervical palatino/lingual (Clase V palatina). Solo en la vista lateral. */
  | "cervicalLingual"
  // ── LEGACY, SOLO LECTURA ──────────────────────────────────────────────────
  /**
   * @deprecated Registro anterior a la cualificación por vista. Nunca se emite
   * desde el generador de SVG ni desde la UI; solo se LEE (ver
   * `getLegacySurfaceAliases`). No dice de qué vista salió y no es deducible.
   */
  | "mesial"
  /** @deprecated Ídem `mesial`: registro anterior, sin vista. Solo lectura. */
  | "distal";

/**
 * Las 13 celdas MARCABLES. Es la ÚNICA lista de caras del sistema: prohibido
 * escribir listas literales de superficies en cualquier otro sitio. Si un
 * componente usa su propia lista y se queda corta, `surfaceColors[x]` devuelve
 * `undefined` (que no es `"transparent"`) y las superficies se pintan NEGRAS —
 * fallo silencioso y difícil de diagnosticar.
 */
export const PAINTABLE_SURFACES = [
  "mesialVestibular",
  "mesialOclusal",
  "mesialLingual",
  "distalVestibular",
  "distalOclusal",
  "distalLingual",
  "facial",
  "facialOclusal",
  "lingual",
  "lingualOclusal",
  "oclusal",
  "cervicalVestibular",
  "cervicalLingual",
] as const satisfies readonly ToothSurface[];

/**
 * Códigos que solo pueden APARECER en registro antiguo. Siguen siendo miembros
 * válidos de `ToothSurface` para que ningún dato histórico quede huérfano ni
 * rompa un `switch` exhaustivo, pero ningún camino de escritura los emite.
 */
export const LEGACY_SURFACES = ["mesial", "distal"] as const;

/** Superficie de una celda marcable (excluye los códigos legacy). */
export type PaintableSurface = (typeof PAINTABLE_SURFACES)[number];

/** Código legacy (registro anterior a la cualificación por vista). */
export type LegacySurface = (typeof LEGACY_SURFACES)[number];

/**
 * Superficie canónica ADA/CDT (las 5 de toda la vida). Vocabulario de catálogos,
 * plantillas, reglas clínicas, resúmenes y conteos. **Nunca se almacena en una
 * celda; siempre se deriva** con `projectToCanonicalSurface`.
 */
export type CanonicalSurface =
  | "mesial"
  | "distal"
  | "facial"
  | "lingual"
  | "oclusal";

/**
 * Familia anatómica de una celda: agrupa las celdas de la misma cara aunque
 * pertenezcan a vistas distintas. Lo usan los atajos "cara completa" (marcar las
 * 3 celdas mesiales de un golpe → una MOD en 3 clics) y los avisos clínicos.
 * A diferencia de `CanonicalSurface`, conserva `cervical` como familia propia.
 */
export type SurfaceZone = CanonicalSurface | "cervical";

/** Vista del odontograma desde la que se observa (y se marca) una celda. */
export type SurfaceView = "vestibular" | "oclusal" | "lateral";

/** Vocabulario real de `IcdasTemplateRule.surfaceFilter` en el backend. */
export type IcdasSurfaceFilter =
  | "proximal"
  | "oclusal"
  | "facial"
  | "lingual"
  | "cervical";

export type LegacyToothSurface = ToothSurface;

export type SurfaceZoneCode =
  | ToothSurface
  | "incisal"
  | "palatino"
  | "cervical"
  | "radicular";

export interface SurfaceRef {
  /** Zona anatómica de PRESENTACIÓN (agrupada): `cervical`, `incisal`, `palatino`… */
  code: SurfaceZoneCode;
  region?: "crown" | "root";
  /**
   * El `ToothSurface` TAL COMO SE MARCÓ, con su vista incrustada
   * (`cervicalVestibular`, `mesialOclusal`, …). Es el dato preciso; `code` es la
   * agrupación de presentación. El nombre "legacy" es histórico: el campo se
   * PERSISTE dentro de `surfacesV2` en el blob `Odontogram.state` y en los
   * snapshots append-only de `OdontogramHistory`, así que no se renombra.
   */
  legacyCode?: LegacyToothSurface;
  displayLabel?: string;
}

export type SurfaceStatus =
  | "healthy"
  | "pathology"
  | "planned"
  | "completed"
  | "preventive"
  | "absent";

export interface SurfaceState {
  surface: ToothSurface;
  status: SurfaceStatus;
  icdasScore?: ICDASScore;
  treatmentType?: string;
  color: string;
  lastUpdate: string;
  notes?: string;
}

export type ICDASScore = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CariesType = "coronal" | "radicular";
export type CariesActivity = "activa" | "inactiva" | "no-aplica";
export type NonCariousLesion =
  | "atricion"
  | "abrasion"
  | "erosion"
  | "hipoplasia"
  | "fisura"
  | "fractura";
export type DiagnosisVisualImpact = "surface" | "tooth" | "none";
export type DiagnosisFindingKind =
  | "caries"
  | "non-carious-lesion"
  | "support-only";

export interface SurfaceDiagnosis {
  surface: ToothSurface;
  surfaceRef?: SurfaceRef;
  icdasScore: ICDASScore;
  cariesType?: CariesType;
  cariesActivity?: CariesActivity;
  nonCariousLesions: NonCariousLesion[];
  findingKind?: DiagnosisFindingKind;
  visualImpact?: DiagnosisVisualImpact;
  notes?: string;
  lastUpdate: string;
}

export function isAnteriorToothNumber(toothNumber: number): boolean {
  const position = toothNumber % 10;
  return position >= 1 && position <= 3;
}

/** Maxilar = cuadrantes 1 y 2 (FDI/ISO 3950). */
export function isMaxillaryToothNumber(toothNumber: number): boolean {
  const quadrant = Math.floor(toothNumber / 10);
  return quadrant === 1 || quadrant === 2;
}

// ── Funciones puras del contrato de superficies ──────────────────────────────
// Son funciones puras del TIPO, no un servicio de dominio: viven aquí junto a
// `createSurfaceRef` y por tanto no se registran en `services/index.ts`.

/**
 * ¿Es un código de registro anterior (sin vista)? Se discrimina por el CÓDIGO,
 * jamás por `schemaVersion`: `tooth-modal` re-sella la versión sobre eventos
 * existentes sin tocar `surfaces`, así que fiarse de la versión haría
 * desaparecer hallazgos antiguos al primer guardado. Por el código es imposible:
 * `mesial`/`distal` son legacy por construcción, porque ninguna vista los emite.
 */
export function isLegacySurface(
  surface: ToothSurface,
): surface is LegacySurface {
  return surface === "mesial" || surface === "distal";
}

/**
 * Familia anatómica de una celda (agrupa las celdas de la misma cara aunque
 * sean de vistas distintas). Es lo que necesitan los atajos "Mesial completa" y
 * los avisos de coherencia clínica. Conserva `cervical` como familia propia
 * (para eso está separada de `projectToCanonicalSurface`).
 */
export function getSurfaceZone(surface: ToothSurface): SurfaceZone {
  switch (surface) {
    case "mesial":
    case "mesialVestibular":
    case "mesialOclusal":
    case "mesialLingual":
      return "mesial";
    case "distal":
    case "distalVestibular":
    case "distalOclusal":
    case "distalLingual":
      return "distal";
    case "facial":
    case "facialOclusal":
      return "facial";
    case "lingual":
    case "lingualOclusal":
      return "lingual";
    case "oclusal":
      return "oclusal";
    case "cervicalVestibular":
    case "cervicalLingual":
      return "cervical";
  }
}

/**
 * Vista desde la que se observa (y se marca) la celda. `null` para los códigos
 * legacy: su vista no quedó registrada y NO es deducible — inventarla sería
 * falsificar registro clínico. `oclusal` pertenece a la vista oclusal aunque en
 * anteriores se dibuje también en las otras dos (es una sola celda compartida).
 */
export function getSurfaceView(surface: ToothSurface): SurfaceView | null {
  switch (surface) {
    case "mesialVestibular":
    case "distalVestibular":
    case "facial":
    case "cervicalVestibular":
      return "vestibular";
    case "mesialOclusal":
    case "distalOclusal":
    case "facialOclusal":
    case "lingualOclusal":
    case "oclusal":
      return "oclusal";
    case "mesialLingual":
    case "distalLingual":
    case "lingual":
    case "cervicalLingual":
      return "lateral";
    case "mesial":
    case "distal":
      return null;
  }
}

/**
 * NIVEL 2: proyecta la celda a la superficie canónica ADA/CDT. Se usa para
 * catálogos de procedimientos, plantillas, resúmenes tipo `MOD`, CONTEOS y
 * facturación — nunca para almacenar. Las cervicales se proyectan a
 * `facial`/`lingual` (regla Open Dental: la casilla Clase V se dibuja aparte
 * pero se factura como bucal/lingual).
 *
 * OJO: para el filtro clínico de ICDAS existe `toIcdasSurfaceFilter`, que
 * deliberadamente NO colapsa cervical en facial. Son dos funciones distintas a
 * propósito: proyección CONTABLE vs filtro CLÍNICO.
 */
export function projectToCanonicalSurface(
  surface: ToothSurface,
): CanonicalSurface {
  const zone = getSurfaceZone(surface);
  if (zone !== "cervical") return zone;
  return surface === "cervicalLingual" ? "lingual" : "facial";
}

/**
 * Traduce la celda al vocabulario real de `IcdasTemplateRule.surfaceFilter`
 * (`proximal | oclusal | facial | lingual | cervical`). El front mandaba el
 * `ToothSurface` crudo, por eso las reglas `"proximal"` no casaban NUNCA
 * (`"mesial"` ≠ `"proximal"`). Cervical se mantiene como `"cervical"` — que hoy
 * ninguna regla usa — en vez de colapsarla a `facial`: eso le abriría de golpe
 * todas las plantillas vestibulares sin que nadie lo haya decidido clínicamente.
 */
export function toIcdasSurfaceFilter(surface: ToothSurface): IcdasSurfaceFilter {
  const zone = getSurfaceZone(surface);
  if (zone !== "mesial" && zone !== "distal") return zone;

  // "Proximal" es el punto de contacto, no la familia entera. Solo la celda
  // vista desde OCLUSAL (reborde marginal) lo es; los ángulos línea
  // mesio-vestibular y mesio-palatino son superficie LIBRE, y darles reglas
  // proximales sugeriría infiltración interproximal donde no hay contacto.
  // Misma regla que aplica `TreatmentSuggestionService`: si divergen, un
  // hallazgo recibe dos recomendaciones distintas según quién pregunte.
  // Los códigos legacy sin vista sí entran: en su día significaban "la proximal".
  const view = getSurfaceView(surface);
  if (view === "vestibular") return "facial";
  if (view === "lateral") return "lingual";
  return "proximal";
}

/**
 * Celdas que debe PINTAR un código antiguo. Un evento guardado como
 * `surfaces: ["mesial"]` no dice de qué vista salió, así que se enciende la
 * familia entera para que el hallazgo histórico siga viéndose igual que antes.
 *
 * REGLA DURA: esto es fan-out de RENDER, no de datos. Vive exclusivamente en
 * `OdontogramColorService.getSurfaceColor`. Replicarlo en los caminos de
 * lectura/edición de eventos (tooth-modal, diagnosis-tab, plan-tab) duplicaría
 * diagnósticos y crearía eventos fantasma. Tampoco se convierte el dato al
 * editar: si el clínico quiere precisar la vista, desmarca y vuelve a marcar.
 *
 * Caso aparte: `cervicalLingual` en un ANTERIOR se pinta como `lingual` porque
 * tras la corrección del clasificador esos dientes ya no tienen celda cervical
 * palatina (su vista lateral solo tiene filo incisal + cuerpo palatino). En
 * posteriores `cervicalLingual` sigue siendo un código de primera clase.
 */
export function getLegacySurfaceAliases(
  surface: ToothSurface,
  toothNumber: number,
): readonly ToothSurface[] {
  switch (surface) {
    case "mesial":
      return ["mesialVestibular", "mesialOclusal", "mesialLingual"];
    case "distal":
      return ["distalVestibular", "distalOclusal", "distalLingual"];
    case "cervicalLingual":
      return isAnteriorToothNumber(toothNumber) ? ["lingual"] : [];
    default:
      return [];
  }
}

/**
 * Letra de la superficie canónica para resúmenes tipo `MOD`. Depende del diente:
 * el borde de un anterior es `I` (incisal) y no `O`, y la cara interna es `P`
 * (palatino) en maxilares y `L` (lingual) en mandibulares (FDI/ISO 3950).
 */
export function canonicalSurfaceLetter(
  toothNumber: number,
  surface: CanonicalSurface,
): "M" | "D" | "O" | "I" | "V" | "P" | "L" {
  switch (surface) {
    case "mesial":
      return "M";
    case "distal":
      return "D";
    case "oclusal":
      return isAnteriorToothNumber(toothNumber) ? "I" : "O";
    case "facial":
      return "V";
    case "lingual":
      return isMaxillaryToothNumber(toothNumber) ? "P" : "L";
  }
}

/** Orden canónico de lectura odontológica: M · O/I · D · V · P/L. */
const CANONICAL_SUMMARY_ORDER: readonly CanonicalSurface[] = [
  "mesial",
  "oclusal",
  "distal",
  "facial",
  "lingual",
];

/**
 * Resumen del diente en notación clásica (`"MOD"`), computado sobre las celdas
 * PROYECTADAS y deduplicadas. Es lo que debe mostrar un chip de plan o de
 * procedimiento realizado: `MOD` sigue significando "restauración continua que
 * abarca esas caras", no "5 celdas". El detalle granular va en el `title`.
 */
export function summarizeCanonicalSurfaces(
  toothNumber: number,
  surfaces: readonly ToothSurface[],
): string {
  const canonical = new Set(surfaces.map(projectToCanonicalSurface));
  return CANONICAL_SUMMARY_ORDER.filter((c) => canonical.has(c))
    .map((c) => canonicalSurfaceLetter(toothNumber, c))
    .join("");
}

export function createSurfaceRef(
  toothNumber: number,
  surface: ToothSurface,
  cariesType?: CariesType,
): SurfaceRef {
  if (cariesType === "radicular") {
    return {
      code: "radicular",
      region: "root",
      legacyCode: surface,
      displayLabel: "Radicular",
    };
  }

  // `code` es la zona de PRESENTACIÓN (agrupada); `legacyCode` conserva siempre
  // la celda exacta que se marcó, con su vista. Así el registro no pierde
  // precisión aunque la agrupación colapse varias celdas en la misma etiqueta.
  const zone = getSurfaceZone(surface);

  if (zone === "cervical") {
    return {
      code: "cervical",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Cervical",
    };
  }

  if (zone === "oclusal" && isAnteriorToothNumber(toothNumber)) {
    return {
      code: "incisal",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Incisal",
    };
  }

  // Cara lingual en dientes maxilares = Palatino (FDI).
  if (zone === "lingual" && isMaxillaryToothNumber(toothNumber)) {
    return {
      code: "palatino",
      region: "crown",
      legacyCode: surface,
      displayLabel: "Palatino",
    };
  }

  return {
    code: zone,
    region: "crown",
    legacyCode: surface,
  };
}
