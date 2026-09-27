import type { ClinicLanguage } from "@/lib/entity/settings";
import { en } from "@/lib/i18n/locales/en";
import { es, type TranslationMessages } from "@/lib/i18n/locales/es";
import { fr } from "@/lib/i18n/locales/fr";
import { it } from "@/lib/i18n/locales/it";
import { pt } from "@/lib/i18n/locales/pt";

export const translations = {
  es,
  en,
  fr,
  it,
  pt,
} as const satisfies Record<ClinicLanguage, TranslationMessages>;

export type TranslationKey = keyof typeof es;
