import { safeUserMessage } from "@/lib/errors/normalize-error";

/**
 * Errors of Segments and Campaigns.
 *
 * Backend format: `{ code, message, status, timestamp, path, errorCode }`. The screens decide
 * what to do by `errorCode`, never by the text. A 403 without `errorCode` is a missing permission.
 */

export const GROWTH_ERROR_CODES = [
  "MODULE_NOT_ENABLED",
  "SEGMENT_AUDIENCE_IMMUTABLE",
  "SEGMENT_FIELD_NOT_ALLOWED",
  "CAMPAIGN_TEMPLATE_VARIABLES_UNSUPPORTED",
] as const;
export type GrowthErrorCode = (typeof GROWTH_ERROR_CODES)[number];

export const GROWTH_MODULE_DISABLED_MESSAGE = "Tu clínica no tiene habilitado este módulo";

export class GrowthApiError extends Error {
  readonly status?: number;
  /** Generic backend `code` (FORBIDDEN, VALIDATION...). */
  readonly code?: string;
  /** Business code: the only thing the UI decides with. */
  readonly errorCode?: GrowthErrorCode | string;

  constructor(message: string, status?: number, code?: string, errorCode?: string) {
    super(message);
    this.name = "GrowthApiError";
    this.status = status;
    this.code = code;
    this.errorCode = errorCode;
  }
}

function readString(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Turns an HTTP error response into a `GrowthApiError`. The message is sanitized like everywhere else. */
export function toGrowthError(status: number | undefined, body: unknown, fallback: string): GrowthApiError {
  const code = readString(body, "code");
  const errorCode = readString(body, "errorCode");
  if (status === 403 && errorCode === "MODULE_NOT_ENABLED") {
    return new GrowthApiError(GROWTH_MODULE_DISABLED_MESSAGE, status, code, errorCode);
  }
  const raw = readString(body, "message") ?? readString(body, "details");
  return new GrowthApiError(raw ? safeUserMessage(raw, status) : fallback, status, code, errorCode);
}

export function isGrowthApiError(error: unknown): error is GrowthApiError {
  return error instanceof GrowthApiError;
}

export function hasGrowthErrorCode(error: unknown, errorCode: GrowthErrorCode): boolean {
  return isGrowthApiError(error) && error.errorCode === errorCode;
}

/** The clinic lost the module that the audience needs (the plan changed with the session open). */
export function isGrowthModuleDisabledError(error: unknown): boolean {
  return hasGrowthErrorCode(error, "MODULE_NOT_ENABLED");
}

export function growthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
