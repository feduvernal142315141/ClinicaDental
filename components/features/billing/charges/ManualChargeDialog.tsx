"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { useServiceCatalog } from "@/lib/hooks/billing";
import { useManualChargeForm } from "@/lib/hooks/billing/use-manual-charge-form";
import { nowLocalInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils/billing-currency";
import { notify } from "@/lib/utils/notify";
import { NumberInput } from "../shared/NumberInput";
import { PatientPicker } from "../shared/PatientPicker";

interface ManualChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Paciente fijo (desde su cuenta). */
  patientId?: string;
  patientName?: string | null;
}

const NO_SERVICE = "__none__";

/** Cargo manual: queda PENDIENTE hasta cobrarlo en un recibo. */
export function ManualChargeDialog({ open, onOpenChange, patientId, patientName }: ManualChargeDialogProps) {
  const catalog = useServiceCatalog(open);
  const [selectedName, setSelectedName] = useState<string | null>(patientName ?? null);
  const { form, submit, submitting } = useManualChargeForm({
    open,
    patientId,
    onSuccess: (charge) => {
      notify.success("Cargo registrado", {
        description: `${charge.description} · ${formatMoney(charge.total, charge.currency)}`,
      });
      onOpenChange(false);
    },
  });
  const rootError = form.formState.errors.root?.message;

  const serviceOptions = [
    { value: NO_SERVICE, label: "Sin servicio (texto libre)" },
    ...(catalog.data ?? []).map((service) => ({
      value: service.id,
      label: `${service.code} — ${service.name}`,
      searchText: `${service.code} ${service.name}`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ink">Cargo manual</DialogTitle>
          <DialogDescription className="text-subtle">
            Registra un servicio realizado que aún no se cobra. Quedará pendiente hasta incluirlo en un recibo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="patientId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <FormControl>
                    <PatientPicker
                      value={field.value}
                      selectedName={selectedName}
                      locked={!!patientId}
                      invalid={!!fieldState.error}
                      onBlur={field.onBlur}
                      onChange={(patient) => {
                        field.onChange(patient?.id ?? "");
                        setSelectedName(patient?.name ?? null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio (opcional)</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value || NO_SERVICE}
                      onChange={(value) => {
                        if (value === NO_SERVICE) return field.onChange(undefined);
                        field.onChange(value);
                        const service = catalog.data?.find((s) => s.id === value);
                        if (service) {
                          form.setValue("description", service.name.slice(0, 200), { shouldValidate: true });
                          form.setValue("unitPrice", service.cost, { shouldValidate: true });
                        }
                      }}
                      options={serviceOptions}
                      searchable
                      searchPlaceholder="Buscar servicio…"
                      aria-label="Servicio"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="toothRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pieza</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} maxLength={20} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <NumberInput {...field} min={0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <NumberInput {...field} min={0} placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="performedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de realización</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} max={nowLocalInput()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {rootError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar cargo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
