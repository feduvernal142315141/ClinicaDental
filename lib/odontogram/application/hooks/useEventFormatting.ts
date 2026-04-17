import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types";

export function useEventFormatting() {
  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "diagnosis":
        return "bg-red-100 text-red-800 border-red-200";
      case "plan":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "performed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "diagnosis":
        return "Diagnóstico";
      case "plan":
        return "Plan";
      case "performed":
        return "Realizado";
      default:
        return type;
    }
  };

  const formatEventDate = (date: unknown) => {
    if (!date) return "Sin fecha";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Sin fecha";
      return format(dateObj, "PPP", { locale: es });
    } catch {
      return "Sin fecha";
    }
  };

  const getEventDisplayName = (event: ClinicalEvent): string => {
    return event.procedureName || event.notes || "Sin nombre";
  };

  const getEventTagColor = (type: string): string => {
    switch (type) {
      case "diagnosis":
        return "red";
      case "plan":
        return "gold";
      case "performed":
        return "blue";
      default:
        return "default";
    }
  };

  return {
    getEventBadgeColor,
    getEventTagColor,
    getEventTypeLabel,
    formatEventDate,
    getEventDisplayName,
  };
}
