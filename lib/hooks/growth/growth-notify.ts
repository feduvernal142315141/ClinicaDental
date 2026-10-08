import { hasGrowthErrorCode, isGrowthModuleDisabledError } from "@/lib/services/growth/growth-errors";
import { notify } from "@/lib/utils/notify";

/**
 * Error toast of Segments and Campaigns. "Module not enabled" is announced once by the app
 * (it also refreshes the clinic capabilities), so it is not repeated here.
 */
export function notifyGrowthError(error: unknown, fallback: string): void {
  if (isGrowthModuleDisabledError(error)) return;
  const message = error instanceof Error && error.message ? error.message : fallback;
  if (hasGrowthErrorCode(error, "CAMPAIGN_TEMPLATE_VARIABLES_UNSUPPORTED")) {
    notify.error(message, { description: "Edita la campaña y elige otra plantilla." });
    return;
  }
  notify.error(message);
}
