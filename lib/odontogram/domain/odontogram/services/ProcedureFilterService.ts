import type { ProcedureCatalogItem, ProcedureCategory } from "../types"

export class ProcedureFilterService {
  static filterByCategory(
    procedures: ProcedureCatalogItem[],
    category: ProcedureCategory | "all"
  ): ProcedureCatalogItem[] {
    if (category === "all") return procedures
    return procedures.filter((p) => p.category === category)
  }

  static filterBySearch(
    procedures: ProcedureCatalogItem[],
    query: string
  ): ProcedureCatalogItem[] {
    if (!query) return procedures

    const lowerQuery = query.toLowerCase()
    return procedures.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
        p.code?.toLowerCase().includes(lowerQuery)
    )
  }

  static filterCatalog(
    procedures: ProcedureCatalogItem[],
    category: ProcedureCategory | "all",
    searchQuery: string
  ): ProcedureCatalogItem[] {
    let filtered = this.filterByCategory(procedures, category)
    filtered = this.filterBySearch(filtered, searchQuery)
    return filtered
  }

  static sortByName(procedures: ProcedureCatalogItem[]): ProcedureCatalogItem[] {
    return [...procedures].sort((a, b) => a.name.localeCompare(b.name))
  }

  static sortByCost(procedures: ProcedureCatalogItem[]): ProcedureCatalogItem[] {
    return [...procedures].sort((a, b) => a.baseCost - b.baseCost)
  }
}
