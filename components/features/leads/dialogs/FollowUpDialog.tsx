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
  Input,
  Textarea,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { dateToLocalInput, localInputToIso, nowLocalInput } from "@/lib/datetime";
import type { Lead } from "@/lib/entity/leads";
import { LEAD_NOTE_MAX, leadFollowUpSchema, type LeadFollowUpValues } from "@/lib/entity/leads/schemas";
import { useLeadUserOptions, useScheduleFollowUp } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { formatLeadDateTime } from "../shared/lead-format";

const NONE = "__none__";

interface FollowUpDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mañana a las 09:00, hora local: un punto de partida razonable para "llamar de nuevo". */
function tomorrowMorning(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return dateToLocalInput(date);
}

/** Programar un seguimiento (recordatorio de contactar al prospecto). */
export function FollowUpDialog({ lead, open, onOpenChange }: FollowUpDialogProps) {
  const users = useLeadUserOptions(open);
  const schedule = useScheduleFollowUp();
  const defaults = (): LeadFollowUpValues => ({
    dueAt: tomorrowMorning(),
    note: "",
    assignedToUserId: lead.assignedToUserId ?? "",
  });
  const form = useForm<LeadFollowUpValues>({
    resolver: zodResolver(leadFollowUpSchema),
    mode: "onBlur",
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      const followUp = await schedule.mutateAsync({
        id: lead.id,
        data: {
          dueAt: localInputToIso(values.dueAt),
          note: values.note || undefined,
          assignedToUserId: values.assignedToUserId || undefined,
        },
      });
      notify.success("Seguimiento programado", { description: formatLeadDateTime(followUp.dueAt) });
      onOpenChange(false);
    } catch (error) {
      if (!isLeadModuleDisabledError(error)) form.setError("root", { message: leadErrorMessage(error) });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={(next) => !schedule.isPending && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Programar seguimiento</DialogTitle>
          <DialogDescription className="text-subtle">
            Un recordatorio para volver a contactar a esta persona.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} min={nowLocalInput()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedToUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quién lo hará</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value || NONE}
                      onChange={(value) => field.onChange(value === NONE ? "" : value)}
                      options={[
                        { value: NONE, label: "Sin asignar" },
                        ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
                      ]}
                      searchable
                      searchPlaceholder="Buscar persona…"
                      aria-label="Quién lo hará"
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
                    <Textarea {...field} rows={3} maxLength={LEAD_NOTE_MAX} placeholder="Qué hay que hacer" />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={schedule.isPending}>
                {schedule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Programar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
