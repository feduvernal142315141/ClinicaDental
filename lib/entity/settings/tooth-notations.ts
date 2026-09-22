import type { ToothNotation } from "@/lib/odontogram/notation";
import { normalizeText } from "@/lib/utils/text";

export interface ToothNotationCatalogEntry {
  value: ToothNotation;
  label: string;
  description: string;
  searchText: string;
}

type ToothNotationMeta = Omit<
  ToothNotationCatalogEntry,
  "value" | "searchText"
> & {
  searchAliases: string;
};

const NOTATION_META_IN_DISPLAY_ORDER: Record<ToothNotation, ToothNotationMeta> =
  {
    fdi: {
      label: "FDI / ISO 3950",
      description: "Estándar internacional, dos dígitos",
      searchAliases:
        "iso 3950 oms internacional latinoamerica europa dos digitos 11 48",
    },
    universal: {
      label: "Universal / ADA",
      description: "Numeración 1–32",
      searchAliases: "ada estados unidos eeuu usa americana 1 32",
    },
    palmer: {
      label: "Palmer",
      description: "Dígito con símbolo de cuadrante",
      searchAliases:
        "zsigmondy reino unido ortodoncia cuadrante corchete simbolo",
    },
  };

export const TOOTH_NOTATION_CATALOG: readonly ToothNotationCatalogEntry[] =
  Object.entries(NOTATION_META_IN_DISPLAY_ORDER).map(([value, meta]) => ({
    value: value as ToothNotation,
    label: meta.label,
    description: meta.description,
    searchText: normalizeText(
      `${value} ${meta.label} ${meta.description} ${meta.searchAliases}`,
    ),
  }));
