export function useToothNavigation() {
  const getNextToothInArch = (currentToothNumber: number): number | null => {
    const quadrant = Math.floor(currentToothNumber / 10)
    const position = currentToothNumber % 10

    if (position < 8) {
      return quadrant * 10 + (position + 1)
    }

    const nextQuadrant = quadrant < 4 ? quadrant + 1 : 1
    return nextQuadrant * 10 + 1
  }

  const getPreviousToothInArch = (currentToothNumber: number): number | null => {
    const quadrant = Math.floor(currentToothNumber / 10)
    const position = currentToothNumber % 10

    if (position > 1) {
      return quadrant * 10 + (position - 1)
    }

    const previousQuadrant = quadrant > 1 ? quadrant - 1 : 4
    return previousQuadrant * 10 + 8
  }

  const getToothQuadrant = (toothNumber: number): number => {
    return Math.floor(toothNumber / 10)
  }

  const getToothPosition = (toothNumber: number): number => {
    return toothNumber % 10
  }

  return {
    getNextToothInArch,
    getPreviousToothInArch,
    getToothQuadrant,
    getToothPosition,
  }
}
