"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEffectiveClinicLanguageFromToken,
  LANGUAGE_CHANGED_EVENT,
  setPreferredClinicLanguage,
} from "@/lib/auth/language-preference";
import type { ClinicLanguage } from "@/lib/entity/settings";
import { normalizeClinicLanguage } from "@/lib/entity/settings";
import { translations, type TranslationKey } from "@/lib/i18n/translations";

interface I18nContextValue {
  language: ClinicLanguage;
  setLanguage: (language: string) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<ClinicLanguage>("es");

  useEffect(() => {
    setLanguageState(getEffectiveClinicLanguageFromToken());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const next = normalizeClinicLanguage(
        event instanceof CustomEvent ? event.detail : null,
      );
      if (next) setLanguageState(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "language") return;
      const next = normalizeClinicLanguage(event.newValue);
      if (next) setLanguageState(next);
    };

    window.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: string) => {
    setLanguageState(setPreferredClinicLanguage(nextLanguage));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.es[key],
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
