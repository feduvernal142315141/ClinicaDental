import type { ToothSurface } from "../types/surface.types"

export class ToothTypeService {
  static getToothTypeName(toothNumber: number): string {
    const lastDigit = toothNumber % 10
    if (lastDigit === 1 || lastDigit === 2) return "Incisivo"
    if (lastDigit === 3) return "Canino"
    if (lastDigit === 4 || lastDigit === 5) return "Premolar"
    if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return "Molar"
    return "Diente"
  }

  static isAnterior(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit >= 1 && lastDigit <= 3
  }

  static isPosterior(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit >= 4 && lastDigit <= 8
  }

  static isMolar(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit >= 6 && lastDigit <= 8
  }

  static isPremolar(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit === 4 || lastDigit === 5
  }

  static isCanine(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit === 3
  }

  static isIncisor(toothNumber: number): boolean {
    const lastDigit = toothNumber % 10
    return lastDigit === 1 || lastDigit === 2
  }

  // --- Arcada / cuadrante (FDI/ISO 3950) ---
  // Cuadrantes 1 y 2 = maxilar (arriba); 3 y 4 = mandibular (abajo).

  static getQuadrant(toothNumber: number): number {
    return Math.floor(toothNumber / 10)
  }

  static isMaxillary(toothNumber: number): boolean {
    const q = this.getQuadrant(toothNumber)
    return q === 1 || q === 2
  }

  static isMandibular(toothNumber: number): boolean {
    const q = this.getQuadrant(toothNumber)
    return q === 3 || q === 4
  }

  static getArch(toothNumber: number): "maxillary" | "mandibular" {
    return this.isMaxillary(toothNumber) ? "maxillary" : "mandibular"
  }

  /**
   * Etiqueta canónica FDI de una CELDA, decidida por ARCADA (palatino vs
   * lingual) y por SECTOR (incisal vs oclusal, labial vs vestibular). Fuente
   * única de verdad para el selector de caras y la pestaña de superficies.
   *
   * La abreviatura de las celdas cualificadas por vista usa punto medio (`M·V`)
   * y NO se puede quitar: sin él, `MO` colisiona con la notación CDT de
   * restauración mesio-oclusal y un odontólogo lo lee mal.
   *
   * El `switch` es EXHAUSTIVO a propósito (sin `default`): si mañana se añade un
   * código de superficie, TS2366 obliga a decidir su etiqueta aquí en vez de
   * dejar que se cuele un texto genérico.
   */
  static getSurfaceLabel(
    toothNumber: number,
    surface: ToothSurface,
  ): { short: string; full: string } {
    const anterior = this.isAnterior(toothNumber)
    const maxillary = this.isMaxillary(toothNumber)
    // La cara interna se nombra por ARCADA (FDI/ISO 3950), nunca por sector.
    const inner = maxillary ? "palatino" : "lingual"
    const innerLetter = maxillary ? "P" : "L"
    // En anteriores la cara externa es labial; en posteriores, vestibular.
    const outerFull = anterior ? "Labial" : "Vestibular"

    switch (surface) {
      // ── Proximales: tres celdas por familia, una por vista ────────────────
      case "mesialVestibular":
        return {
          short: "M·V",
          full: anterior ? "Mesio-labial" : "Mesio-vestibular",
        }
      case "mesialOclusal":
        // Celda proximal CANÓNICA: es la que un odontólogo llama "la mesial"
        // (Clase II). Las reglas proximales se anclan aquí, no en la familia.
        return {
          short: "M·O",
          full: "Mesial proximal — reborde marginal y punto de contacto",
        }
      case "mesialLingual":
        return { short: `M·${innerLetter}`, full: `Mesio-${inner}` }
      case "distalVestibular":
        return {
          short: "D·V",
          full: anterior ? "Disto-labial" : "Disto-vestibular",
        }
      case "distalOclusal":
        return {
          short: "D·O",
          full: "Distal proximal — reborde marginal y punto de contacto",
        }
      case "distalLingual":
        return { short: `D·${innerLetter}`, full: `Disto-${inner}` }
      // ── Cuerpos (la vista coincide con la cara → sin sufijo) ──────────────
      case "facial":
        return anterior
          ? { short: "Lab", full: "Labial" }
          : { short: "V", full: "Vestibular" }
      case "facialOclusal":
        return {
          short: "V·O",
          full: `${outerFull} desde oclusal (vertiente vestibular)`,
        }
      case "lingual":
        return maxillary
          ? { short: "P", full: "Palatino" }
          : { short: "L", full: "Lingual" }
      case "lingualOclusal":
        return {
          short: `${innerLetter}·O`,
          full: `${maxillary ? "Palatino" : "Lingual"} desde oclusal (vertiente)`,
        }
      // ── Mesa oclusal / borde incisal: celda ÚNICA, nunca cualificada ──────
      case "oclusal":
        return anterior
          ? { short: "I", full: "Incisal — borde único, visible en las 3 vistas" }
          : { short: "O", full: "Oclusal" }
      // ── Tercio cervical (Clase V): el precedente del desdoble por vista ───
      case "cervicalVestibular":
        return { short: "C·V", full: "Cervical vestibular" }
      case "cervicalLingual":
        return maxillary
          ? { short: "C·P", full: "Cervical palatino" }
          : { short: "C·L", full: "Cervical lingual" }
      // ── LEGACY: registro anterior. No se disfraza de dato preciso ─────────
      case "mesial":
        return { short: "M", full: "Mesial (registro anterior, sin vista)" }
      case "distal":
        return { short: "D", full: "Distal (registro anterior, sin vista)" }
    }
  }

  /**
   * Título de la vista anatómica de un diente, decidido por ARCADA y SECTOR
   * (FDI/ISO 3950): frontal = vestibular; oclusal = incisal en anteriores u
   * oclusal en posteriores; lateral = palatino en maxilar o lingual en
   * mandibular. Reutiliza los helpers isAnterior/isMaxillary como fuente de verdad.
   */
  static getViewTitle(
    toothNumber: number,
    view: "frontal" | "oclusal" | "lateral",
  ): string {
    switch (view) {
      case "frontal":
        return "Vestibular"
      case "oclusal":
        return this.isAnterior(toothNumber) ? "Incisal" : "Oclusal"
      case "lateral":
        return this.isMaxillary(toothNumber) ? "Palatino" : "Lingual"
    }
  }
}
