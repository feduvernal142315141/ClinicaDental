"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Switch } from "@/components/ui/atomic/forms";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import type { DocumentationTemplate } from "@/lib/entity/documentation";
import type { ServiceFormValues } from "@/lib/hooks/services/service-form.schema";
import { useI18n } from "@/lib/contexts/i18n-context";
import { usePermission } from "@/lib/hooks/use-permission";

export function ServiceDocumentationFields({ form, disabled }: {
  form: UseFormReturn<ServiceFormValues>;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const { isAdmin, permissionsObj } = usePermission();
  const canRead = isAdmin || (permissionsObj.documentation ?? 0) > 0;
  const [templates, setTemplates] = useState<DocumentationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selected = form.watch("documentationTemplateId") ?? "";

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    // Page through the existing endpoint, so catalogs beyond the first page remain selectable.
    async function load() {
      const all: DocumentationTemplate[] = [];
      let offset = 0;
      for (;;) {
        const page = await documentationService.templates(offset, 25);
        if (cancelled) return;
        all.push(...page);
        if (page.length < 25) break;
        offset += page.length;
      }
      if (!cancelled) setTemplates(all);
    }
    void load().catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canRead, attempt]);

  const options = [
    { value: "", label: t("services.documentation.none") },
    ...templates.map(template => ({ value: template.id, label: template.name })),
  ];
  if (selected && !templates.some(template => template.id === selected)) {
    options.push({ value: selected, label: t("services.documentation.current") });
  }
  const unavailable = disabled || !canRead || loading || failed;

  return (
    <section className="bento space-y-4 p-4 lg:p-6">
      <div>
        <h3 className="text-base font-semibold text-ink">{t("services.documentation.title")}</h3>
        <p className="text-sm text-subtle">{t("services.documentation.description")}</p>
      </div>
      {!canRead && <p className="text-sm text-subtle">{t("services.documentation.noPermission")}</p>}
      {loading && <p role="status" className="text-sm text-subtle">{t("services.documentation.loading")}</p>}
      {failed && <div role="alert" className="space-y-2 text-sm text-subtle">
        <p>{t("services.documentation.error")}</p>
        <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>{t("services.documentation.retry")}</Button>
      </div>}
      {canRead && !loading && !failed && templates.length === 0 &&
        <p className="text-sm text-subtle">{t("services.documentation.empty")}</p>}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
        <FormField control={form.control} name="documentationTemplateId" render={({ field }) => (
          <FormItem className="min-w-0">
            <FormLabel>{t("services.documentation.template")}</FormLabel>
            <FormControl>
              <Select value={field.value ?? ""} options={options} searchable disabled={unavailable}
                onBlur={field.onBlur} onChange={value => {
                  field.onChange(value);
                  if (!value) form.setValue("documentSignatureRequired", false, { shouldDirty: true, shouldValidate: true });
                }} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="documentSignatureRequired" render={({ field }) => (
          <FormItem className="md:pt-[22px]">
            <div className="flex min-h-[42px] items-center justify-between gap-4 rounded-xl border border-hairline bg-hover/40 px-4 py-2">
              <FormLabel>{t("services.documentation.signature")}</FormLabel>
              <FormControl>
                <Switch checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur}
                  disabled={unavailable || !selected} />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </section>
  );
}
