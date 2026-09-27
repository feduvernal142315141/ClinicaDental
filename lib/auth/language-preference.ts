import { getAccessToken } from "@/lib/auth/token-client";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import {
  DEFAULT_CLINIC_GENERAL_SETTINGS,
  normalizeClinicLanguage,
  type ClinicLanguage,
} from "@/lib/entity/settings";

const LANGUAGE_STORAGE_KEY = "language";
export const LANGUAGE_CHANGED_EVENT = "clinic-language-changed";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStoredLanguage(): ClinicLanguage | null {
  if (!canUseStorage()) return null;
  return normalizeClinicLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function setPreferredClinicLanguage(language: string): ClinicLanguage {
  const normalized =
    normalizeClinicLanguage(language) ?? DEFAULT_CLINIC_GENERAL_SETTINGS.language;
  if (canUseStorage()) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: normalized }),
    );
  }
  return normalized;
}

export function getEffectiveClinicLanguage(
  tokenLanguage?: unknown,
): ClinicLanguage {
  const storedLanguage = readStoredLanguage();
  if (storedLanguage) return storedLanguage;

  const initialLanguage =
    normalizeClinicLanguage(
      typeof tokenLanguage === "string" ? tokenLanguage : null,
    ) ?? DEFAULT_CLINIC_GENERAL_SETTINGS.language;

  if (canUseStorage()) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
  }
  return initialLanguage;
}

export function getEffectiveClinicLanguageFromToken(): ClinicLanguage {
  const accessToken = getAccessToken();
  const decodedToken = accessToken ? decodeJwtPayload(accessToken) : null;
  return getEffectiveClinicLanguage(decodedToken?.language);
}
