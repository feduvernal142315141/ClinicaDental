import { isAxiosError } from "axios";

/** Display controlled validation messages, never server failures or parser diagnostics. */
export function documentationErrorMessage(cause: unknown, t: (key: "documentation.error" | "documentation.conflict" | "documentation.forbidden" | "documentation.layoutError") => string, fallback: "documentation.error" | "documentation.layoutError" = "documentation.error"): string {
  if (!isAxiosError(cause)) return t(fallback);
  const status = cause.response?.status;
  if (status === 409) return t("documentation.conflict");
  if (status === 403) return t("documentation.forbidden");
  const data: unknown = cause.response?.data;
  if ((status === 400 || status === 422) && data && typeof data === "object" && "message" in data &&
      typeof data.message === "string" && data.message.trim() && data.message.length <= 500) {
    return data.message.trim();
  }
  return t(fallback);
}
