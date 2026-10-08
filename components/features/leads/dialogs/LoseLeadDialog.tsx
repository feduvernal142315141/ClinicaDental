"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Textarea,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import {
  LEAD_LOSE_REASONS,
  LEAD_LOST_REASON_LABELS,
  leadDisplayName,
  type Lead,
  type LeadLoseReason,
} from "@/lib/entity/leads";
import { LEAD_NOTE_MAX, leadLoseSchema, type LeadLoseValues } from "@/lib/entity/leads/schemas";
import { useLoseLead } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";

interface LoseLeadDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

/** Cerrar un prospecto con motivo. "Ya era paciente" no se elige aquí: sale de confirmar una coincidencia. */
export function LoseLeadDialog({ lead, onOpenChange }: LoseLeadDialogProps) {
  const lose = useLoseLead();
  const form = useForm<LeadLoseValues>({
    resolver: zodResolver(leadLoseSchema),
    mode: "onBlur",
    defaultValues: { reason: undefined as unknown as LeadLoseReason, note: "" },
  });
  const open = lead !== null;

  useEffect(() => {
    if (open) form.reset({ reason: undefined as unknown as LeadLoseReason, note: "" });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!lead) return;
    form.clearErrors("root");
    try {
      await lose.mutateAsync({ id: lead.id, data: { reason: values.reason, note: values.note || undefined } });
      notify.success("Prospecto cerrado", { description: LEAD_LOST_REASON_LABELS[values.reason] });
      onOpenChange(false);
    } catch (error) {
      if (!isLeadModuleDisabledError(error)) form.setError("root", { message: leadErrorMessage(error) });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={(next) => !lose.isPending && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Cerrar prospecto</DialogTitle>
          <DialogDescription className="text-subtle">
            {lead ? `«${leadDisplayName(lead)}» dejará de estar abierto. Se puede reabrir más adelante.` : ""}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="reason"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value as LeadLoseReason)}
                      onBlur={field.onBlur}
                      options={LEAD_LOSE_REASONS.map((value) => ({ value, label: LEAD_LOST_REASON_LABELS[value] }))}
                      placeholder="Selecciona el motivo"
                      aria-label="Motivo"
                      aria-invalid={!!fieldState.error}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={LEAD_NOTE_MAX} />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={lose.isPending}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={lose.isPending}>
                {lose.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Cerrar prospecto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
