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
}
