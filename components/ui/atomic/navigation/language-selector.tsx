import { useMemo } from "react";

import { Select, type SelectOption } from "@/components/ui/controls/select";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils/utils";

const LANGUAGE_OPTIONS: readonly (Omit<SelectOption, "description"> & {
  descriptionKey: TranslationKey;
})[] = [
  {
    value: "es",
    label: "ES",
    descriptionKey: "app.language.es",
    searchText: "es espanol español spanish",
    icon: <span className="text-base leading-none">🇪🇸</span>,
  },
  {
    value: "en",
    label: "EN",
    descriptionKey: "app.language.en",
    searchText: "en ingles inglés english",
    icon: <span className="text-base leading-none">🇺🇸</span>,
  },
  {
    value: "fr",
    label: "FR",
    descriptionKey: "app.language.fr",
    searchText: "fr frances francés french",
    icon: <span className="text-base leading-none">🇫🇷</span>,
  },
  {
    value: "it",
    label: "IT",
    descriptionKey: "app.language.it",
    searchText: "it italiano italian",
    icon: <span className="text-base leading-none">🇮🇹</span>,
  },
  {
    value: "pt",
    label: "PT",
    descriptionKey: "app.language.pt",
    searchText: "pt portugues portugués portuguese",
    icon: <span className="text-base leading-none">🇵🇹</span>,
  },
];

interface LanguageSelectorProps {
  className?: string;
  placement?: "bottom" | "top";
  compact?: boolean;
}

export function LanguageSelector({
  className,
  placement = "bottom",
  compact = false,
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const options = useMemo<readonly SelectOption[]>(
    () =>
      LANGUAGE_OPTIONS.map(({ descriptionKey, ...option }) => ({
        ...option,
        description: t(descriptionKey),
      })),
    [t],
  );

  return (
    <div
      className={cn(compact ? "w-14" : "w-[96px]", className)}
      title={t("app.language")}
    >
      <Select
        value={language}
        onChange={setLanguage}
        options={options}
        popoverClassName={compact ? "left-0 right-auto w-48" : "left-auto right-0 w-48"}
        popoverPlacement={placement}
        showSelectedLabel={!compact}
        aria-label={t("app.language.selector")}
      />
    </div>
  );
}
