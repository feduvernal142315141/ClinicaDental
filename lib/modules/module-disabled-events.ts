export const MODULE_NOT_ENABLED_ERROR_CODE = "MODULE_NOT_ENABLED";
const EVENT_NAME = "clinic-module-disabled";

export function emitClinicModuleDisabled(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_NAME));
}

export function onClinicModuleDisabled(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
