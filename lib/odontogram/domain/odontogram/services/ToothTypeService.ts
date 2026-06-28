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
   * Etiqueta canónica FDI de una cara, decidida por ARCADA (palatino vs lingual)
   * y por SECTOR (incisal vs oclusal, labial vs vestibular). Fuente única de
   * verdad para el selector de caras y la pestaña de superficies.
   */
  static getSurfaceLabel(
    toothNumber: number,
    surface: ToothSurface,
  ): { short: string; full: string } {
    const anterior = this.isAnterior(toothNumber)
    const maxillary = this.isMaxillary(toothNumber)

    switch (surface) {
      case "mesial":
        return { short: "M", full: "Mesial" }
      case "distal":
        return { short: "D", full: "Distal" }
      case "facial":
        return anterior
          ? { short: "Lab", full: "Labial" }
          : { short: "V", full: "Vestibular" }
      case "lingual":
        // Palatino SOLO depende de la arcada (maxilar), no de anterior/posterior.
        return maxillary
          ? { short: "P", full: "Palatino" }
          : { short: "L", full: "Lingual" }
      case "oclusal":
        return anterior
          ? { short: "I", full: "Incisal" }
          : { short: "O", full: "Oclusal" }
    }
  }
}
