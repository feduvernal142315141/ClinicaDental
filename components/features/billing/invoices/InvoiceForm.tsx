"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { useInvoiceEditor } from "@/lib/hooks/billing/use-invoice-editor";
import { billingErrorMessage } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { CurrencyRateFields } from "../shared/CurrencyRateFields";
import { DocumentFooterFields } from "../shared/DocumentFooterFields";
import { DocumentTotals } from "../shared/DocumentTotals";
import { LineItemsEditor } from "../shared/LineItemsEditor";
import { Money } from "../shared/Money";
import { PatientPicker } from "../shared/PatientPicker";
import { FinanceNoPermission } from "../module/FinanceModuleUnavailable";
import { formatDayMonth } from "../shared/billing-format";

interface InvoiceFormProps {
  invoiceId?: string;
  initialPatientId?: string;
  initialPatientName?: string;
  initialChargeIds?: string[];
}

/** D. Nuevo recibo / editar recibo. */
export function InvoiceForm(props: InvoiceFormProps) {
  const router = useRouter();
  const editor = useInvoiceEditor(props);
  const { form, baseCurrency, permissions, preview, settings, isEdit, invoice, itemsEditable } = editor;
  const currency = form.watch("currency");
  const rootError = form.formState.errors.root?.message;
  const chargeIdsError = form.formState.errors.lines?.message;

  if (!(isEdit ? permissions.canEdit : permissions.canCreate)) return <FinanceNoPermission />;
  if (isEdit && editor.invoiceQuery.isPending) return <LoadingSpinner message="Cargando recibo..." />;
  if (isEdit && (editor.invoiceQuery.isError || !invoice)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{billingErrorMessage(editor.invoiceQuery.error)}</AlertDescription>
      </Alert>
    );
  }
  if (invoice?.status === "VOID") {
    return (
      <Alert variant="warning">
        <AlertDescription>El recibo está anulado: ya no se puede editar.</AlertDescription>
      </Alert>
    );
  }

  const save = async () => {
    const saved = await editor.submit();
    if (!saved) return;
    notify.success(isEdit ? "Recibo actualizado" : "Recibo emitido", {
      description: `${saved.code} · total ${saved.total.toFixed(2)} ${saved.currency}`,
    });
    router.push(`/billing/invoices/${saved.id}`);
  };

  const chargeCurrencyMismatch = editor.selectedCharges.some((charge) => charge.currency !== currency);

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={isEdit ? `Editar recibo ${invoice?.code ?? ""}` : "Nuevo recibo"}
        description="Documento no fiscal. El paciente pasa a deber el total del recibo."
      />

      <Form {...form}>
        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="bento p-5">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field, fieldState }) => (
                <FormItem className="max-w-md">
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
                        form.setValue("chargeIds", []);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {!isEdit && form.watch("patientId") && (
            <section className="bento space-y-3 p-5" aria-labelledby="invoice-charges">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="invoice-charges" className="text-sm font-semibold text-ink">
                  Cargos pendientes del paciente
                </h2>
                {editor.chargesSubtotal > 0 && (
                  <span className="text-sm text-subtle">
                    Seleccionado: <Money amount={editor.chargesSubtotal} currency={currency} className="font-medium text-ink" />
                  </span>
                )}
              </div>
              {editor.chargesQuery.isPending ? (
                <LoadingSpinner size="sm" message="Cargando cargos..." />
              ) : editor.pendingCharges.length === 0 ? (
                <p className="text-sm text-subtle">El paciente no tiene cargos pendientes.</p>
              ) : (
                <ul className="divide-y divide-hairline rounded-xl border border-hairline">
                  {editor.pendingCharges.map((charge) => {
                    const checked = form.watch("chargeIds").includes(charge.id);
                    return (
                      <li key={charge.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-hover/50">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => editor.toggleCharge(charge.id, value === true)}
                            aria-label={`Cobrar ${charge.description}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{charge.description}</span>
                            <span className="text-xs text-subtle">
                              {charge.sourceType === "APPOINTMENT" ? `Cita del ${formatDayMonth(charge.performedAt)}` : "Manual"}
                              {charge.toothRef ? ` · pieza ${charge.toothRef}` : ""}
                              {charge.quantity !== 1 ? ` · ×${charge.quantity}` : ""}
                            </span>
                          </span>
                          <Lock className="h-3.5 w-3.5 text-subtle" aria-label="Las líneas de cargos no se editan" />
                          <Money amount={charge.total} currency={charge.currency} className="text-sm font-medium" />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {chargeCurrencyMismatch && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Los cargos seleccionados están en otra moneda: emite el recibo en la moneda de los cargos.
                </p>
              )}
            </section>
          )}

          <section className="bento space-y-4 p-5" aria-labelledby="invoice-lines">
            <h2 id="invoice-lines" className="text-sm font-semibold text-ink">
              {isEdit ? "Líneas" : "Líneas manuales"}
            </h2>
            {itemsEditable ? (
              <LineItemsEditor form={form} currency={currency} canDiscount={permissions.canDiscount} />
            ) : (
              <Alert variant="info">
                <AlertDescription>
                  Este recibo ya tiene pagos o líneas de cargos: sus importes no se pueden cambiar. Puedes editar las notas
                  y el vencimiento.
                </AlertDescription>
              </Alert>
            )}
            {chargeIdsError && <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{chargeIdsError}</p>}
          </section>

          <section className="bento grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              {!isEdit && (
                <CurrencyRateFields
                  form={form}
                  baseCurrency={baseCurrency}
                  rateQuery={editor.rateQuery}
                  canSaveRate={permissions.canEdit}
                />
              )}
              <DocumentFooterFields
                form={form}
                canDiscount={permissions.canDiscount && itemsEditable}
                isAdmin={permissions.isAdmin}
                maxDiscountPercent={settings?.maxDiscountPercent}
                dateLabel="Vencimiento"
                extraGross={editor.chargesSubtotal}
              />
            </div>
            {isEdit && invoice && !itemsEditable ? (
              <DocumentTotals
                subtotal={invoice.subtotal}
                discount={invoice.discount}
                total={invoice.total}
                currency={invoice.currency}
                paid={invoice.paidAmount}
                balance={invoice.balance}
              />
            ) : (
              <DocumentTotals {...preview} currency={currency} preview />
            )}
          </section>

          {rootError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={editor.submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={editor.submitting}>
              {editor.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Emitir recibo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
