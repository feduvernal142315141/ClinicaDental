import { TREATMENT_SYMBOLS } from "./odontogram-colors.constants";
import type { ColorPriority } from "./odontogram-colors.constants";

export const VISUAL_PRIORITY_TO_COLOR_PRIORITY: Record<string, ColorPriority> =
  {
    absent: "absent",
    implant: "implant",
    "caries-urgent": "caries-urgent",
    "caries-active": "caries-active",
    "caries-initial": "caries-initial",
    endodontic: "endodontic",
    "planned-urgent": "planned-urgent",
    completed: "completed",
    crown: "crown",
    planned: "planned",
    observation: "observation",
    preventive: "preventive",
    healthy: "healthy",
    "surface-diagnosis": "caries-active",
    "tooth-diagnostic": "observation",
    "support-only": "healthy",
  };

export const VISUAL_SYMBOL_KEY_MAP: Record<string, string> = {
  extraction: TREATMENT_SYMBOLS.EXTRACTION.symbol,
  implant: TREATMENT_SYMBOLS.IMPLANT.symbol,
  endodontics: TREATMENT_SYMBOLS.ENDODONTICS.symbol,
  crown: TREATMENT_SYMBOLS.CROWN.symbol,
  bridge: TREATMENT_SYMBOLS.BRIDGE.symbol,
  restoration: TREATMENT_SYMBOLS.RESTORATION.symbol,
  preventive: TREATMENT_SYMBOLS.PREVENTIVE.symbol,
};

export const VISUAL_SYMBOL_PRIORITY: Record<string, number> = {
  absent: 1,
  implant: 2,
  endodontic: 3,
  crown: 4,
  completed: 5,
  planned: 6,
  observation: 7,
  healthy: 99,
};
