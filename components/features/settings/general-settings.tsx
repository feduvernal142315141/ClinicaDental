"use client";

import { AlertCircle, Lock, RotateCw } from "lucide-react";

import { PageHeader } from "@/components/ui/layout/page-header";
import { Form, FormActionBar } from "@/components/ui/atomic/forms";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useGeneralSettingsForm } from "@/lib/hooks/settings";
import { ClinicInfoFields } from "@/components/features/settings/clinic-info-fields";
import { ScheduleEditor } from "@/components/features/settings/schedule-editor";
import { PolicyFields } from "@/components/features/settings/policy-fields";
import { OdontogramFields } from "@/components/features/settings/odontogram-fields";
import { useI18n } from "@/lib/contexts/i18n-context";

/** Scrollea suavemente hacia el primer campo inválido tras un submit fallido. */
function scrollToFirstInvalidField() {
  requestAnimationFrame(() => {
    const el = document.querySelector('[aria-invalid="true"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold leading-tight text-ink">
        {title}
      </h3>
      <p className="text-sm text-subtle">{subtitle}</p>
    </div>
  );
}

function GeneralSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bento space-y-4 p-6">
          <div className="h-5 w-48 animate-pulse rounded-md bg-hover" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-hover" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-11 animate-pulse rounded-xl bg-hover" />
            <div className="h-11 animate-pulse rounded-xl bg-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GeneralSettings() {
  const { t } = useI18n();
  const {
    form,
    settings,
    loading,
    saving,
    error,
    reload,
    canEdit,
    handleSubmit,
  } = useGeneralSettingsForm();

  const disabled = !canEdit || saving;
  // Se lee en render para suscribir el proxy de formState (re-render al cambiar).
  const { isDirty } = form.formState;

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("settings.general.pageTitle")}
          subtitle={t("settings.general.loadingSubtitle")}
        />
        <GeneralSettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.general.pageTitle")}
        subtitle={t("settings.general.pageSubtitle")}
      />

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
            />
            <div>
              <p className="text-sm font-medium text-ink">
                {t("settings.general.syncErrorTitle")}
              </p>
              <p className="text-sm text-subtle">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={reload}
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            {t("settings.general.retry")}
          </Button>
        </div>
      )}

      {!canEdit && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"
        >
          <Lock
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div>
            <p className="text-sm font-medium text-ink">
              {t("settings.general.readOnlyTitle")}
            </p>
            <p className="text-sm text-subtle">
              {t("settings.general.readOnlyDescription")}
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit, scrollToFirstInvalidField)}
          noValidate
          className="space-y-6"
        >
          <section className="bento p-6">
            <SectionHeader
              title={t("settings.general.clinicSectionTitle")}
              subtitle={t("settings.general.clinicSectionSubtitle")}
            />
            <ClinicInfoFields
              disabled={disabled}
              subscriptionPlan={settings?.subscriptionPlan}
            />
          </section>

          <section className="bento p-6">
            <SectionHeader
              title={t("settings.general.scheduleSectionTitle")}
              subtitle={t("settings.general.scheduleSectionSubtitle")}
            />
            <ScheduleEditor disabled={disabled} />
          </section>

          <section className="bento p-6">
            <SectionHeader
              title={t("settings.general.policySectionTitle")}
              subtitle={t("settings.general.policySectionSubtitle")}
            />
            <PolicyFields disabled={disabled} />
          </section>

          <section className="bento p-6">
            <SectionHeader
              title={t("settings.general.odontogramSectionTitle")}
              subtitle={t("settings.general.odontogramSectionSubtitle")}
            />
            <OdontogramFields disabled={disabled} />
          </section>

          {/* Barra de acciones sticky ESTÁNDAR del proyecto (FormActionBar). En
              settings usa el patrón "Descartar" (reset) y sólo habilita cuando hay
              cambios sin guardar. Oculta en solo lectura. */}
          {canEdit && (
            <FormActionBar
              isDirty={isDirty}
              dirtyLabel={t("settings.actions.unsaved")}
              cleanLabel={t("settings.actions.saved")}
              onSecondary={() => form.reset()}
              secondaryLabel={t("settings.actions.discard")}
              secondaryIcon={RotateCw}
              disableSecondaryWhenClean
              submitLabel={t("settings.actions.saveChanges")}
              disableSubmitWhenClean
              loading={saving}
            />
          )}
        </form>
      </Form>
    </div>
  );
}
