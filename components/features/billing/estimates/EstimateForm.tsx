"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ListPlus, Loader2, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { isEstimateEditable } from "@/lib/entity/billing";
import { loadPlanLines, usePatientTreatmentPlans } from "@/lib/hooks/billing";
import { useEstimateEditor } from "@/lib/hooks/billing/use-estimate-editor";
import { billingErrorMessage } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { CurrencyRateFields } from "../shared/CurrencyRateFields";
import { DocumentFooterFields } from "../shared/DocumentFooterFields";
import { DocumentTotals } from "../shared/DocumentTotals";
import { LineItemsEditor } from "../shared/LineItemsEditor";
import { PatientPicker } from "../shared/PatientPicker";
import { FinanceNoPermission } from "../module/FinanceModuleUnavailable";
import { notifyBillingError } from "../shared/billing-notify";

interface EstimateFormProps {
  estimateId?: string;
  initialPatientId?: string;
  initialPatientName?: string;
  initialPlanId?: string;
}

const NO_PLAN = "__none__";

/** C. Formulario de presupuesto (alta y edición). */
export function EstimateForm(props: EstimateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editor = useEstimateEditor(props);
  const { form, baseCurrency, permissions, preview, settings, isEdit, estimate } = editor;
  const patientId = form.watch("patientId");
  const plans = usePatientTreatmentPlans(patientId || undefined);
  const currency = form.watch("currency");
  const rootError = form.formState.errors.root?.message;

  if (!(isEdit ? permissions.canEdit : permissions.canCreate)) {
    return <FinanceNoPermission />;
  }
  if (isEdit && editor.estimateQuery.isPending) {
    return <LoadingSpinner message="Cargando presupuesto..." />;
  }
  if (isEdit && editor.estimateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{billingErrorMessage(editor.estimateQuery.error)}</AlertDescription>
      </Alert>
    );
  }
  if (estimate && !isEstimateEditable(estimate.status)) {
    return (
      <Alert variant="warning">
        <AlertDescription>Solo se edita un presupuesto en borrador o enviado.</AlertDescription>
      </Alert>
    );
  }

  const save = async (status: "DRAFT" | "SENT") => {
    const saved = await editor.submit(status);
    if (!saved) return;
    notify.success(isEdit ? "Presupuesto actualizado" : status === "SENT" ? "Presupuesto enviado" : "Presupuesto guardado", {
      description: `${saved.code} · total ${saved.total.toFixed(2)} ${saved.currency}`,
    });
    router.push(`/billing/estimates/${saved.id}`);
  };

  const loadSelectedPlan = async () => {
    const planId = form.getValues("treatmentPlanId");
    if (!planId) return;
    try {
      const lines = await queryClient.fetchQuery({
        queryKey: ["billing-catalog", "plan-lines", planId],
        queryFn: () => loadPlanLines(planId),
      });
      if (lines.length === 0) {
        notify.info("El plan no tiene líneas para presupuestar");
        return;
      }
      form.setValue("lines", lines, { shouldValidate: true });
    } catch (error) {
      notifyBillingError(error, "No se pudieron cargar las líneas del plan");
    }
  };

  const planOptions = [
    { value: NO_PLAN, label: "Sin plan" },
    ...(plans.data ?? []).map((plan) => ({ value: plan.id, label: plan.name })),
  ];

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={isEdit ? `Editar presupuesto ${estimate?.code ?? ""}` : "Nuevo presupuesto"}
        description="Los presupuestos nunca generan deuda: se cobran al convertirlos en recibo."
      />

      {editor.planLinesQuery.isFetching && <LoadingSpinner size="sm" message="Cargando líneas del plan..." />}

      <Form {...form}>
        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save(isEdit ? "DRAFT" : "SENT");
          }}
        >
          <section className="bento grid gap-4 p-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <FormControl>
                    <PatientPicker
                      value={field.value}
                      selectedName={editor.patientName}
                      locked={isEdit || !!props.initialPatientId}
                      invalid={!!fieldState.error}
                      onBlur={field.onBlur}
                      onChange={(patient) => {
                        field.onChange(patient?.id ?? "");
                        editor.setPatientName(patient?.name ?? null);
                        form.setValue("treatmentPlanId", undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="treatmentPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan de tratamiento (opcional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <SearchSelect
                        value={field.value ?? NO_PLAN}
                        onChange={(value) => field.onChange(value === NO_PLAN ? undefined : value)}
                        options={planOptions}
                        disabled={!patientId || isEdit}
                        placeholder={plans.isFetching ? "Cargando planes…" : "Sin plan"}
                        aria-label="Plan de tratamiento"
                      />
                    </FormControl>
                    {!isEdit && field.value && (
                      <Button type="button" variant="outline" onClick={loadSelectedPlan} title="Reemplazar las líneas por las del plan">
                        <ListPlus className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-2">Cargar líneas</span>
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="bento space-y-4 p-5" aria-labelledby="estimate-lines">
            <h2 id="estimate-lines" className="text-sm font-semibold text-ink">
              Líneas
            </h2>
            <LineItemsEditor form={form} currency={currency} canDiscount={permissions.canDiscount} />
          </section>

          <section className="bento grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              <CurrencyRateFields
                form={form}
                baseCurrency={baseCurrency}
                rateQuery={editor.rateQuery}
                canSaveRate={permissions.canEdit}
              />
              <DocumentFooterFields
                form={form}
                canDiscount={permissions.canDiscount}
                isAdmin={permissions.isAdmin}
                maxDiscountPercent={settings?.maxDiscountPercent}
                dateLabel="Válido hasta"
              />
            </div>
            <DocumentTotals {...preview} currency={currency} preview />
          </section>

          {rootError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={editor.submitting}>
              Cancelar
            </Button>
            {isEdit ? (
              <Button type="submit" disabled={editor.submitting}>
                {editor.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => void save("DRAFT")} disabled={editor.submitting}>
                  Guardar como borrador
                </Button>
                <Button type="submit" disabled={editor.submitting}>
                  {editor.submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar
                </Button>
              </>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
