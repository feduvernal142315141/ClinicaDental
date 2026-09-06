export const NO_AUTHORSHIP_LABEL = "Sin registro de autoría";
export function resolveAuthorship(
  updatedBy: string | undefined | null,
): string | null {
  const value = updatedBy?.trim();
  if (!value || value.toLowerCase() === "anonymous") return null;
  return value;
}
