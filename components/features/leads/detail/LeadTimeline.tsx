"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
  Textarea,
} from "@/components/ui";
import { BillingPager } from "@/components/features/billing/shared/BillingPager";
import { LinesSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import { describeLeadActivity, leadActorLabel, type Lead } from "@/lib/entity/leads";
import { LEAD_NOTE_MAX, leadNoteSchema, type LeadNoteValues } from "@/lib/entity/leads/schemas";
import { useAddLeadNote, useLeadActivity, type LeadPermissions } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { formatLeadDateTime } from "../shared/lead-format";

const PAGE_SIZE = 10;

function NoteBox({ lead, onAdded }: { lead: Lead; onAdded: () => void }) {
  const addNote = useAddLeadNote();
  const form = useForm<LeadNoteValues>({
    resolver: zodResolver(leadNoteSchema),
    mode: "onBlur",
    defaultValues: { note: "" },
  });

  const submit = form.handleSubmit(async ({ note }) => {
    form.clearErrors("root");
    try {
      await addNote.mutateAsync({ id: lead.id, note });
      form.reset({ note: "" });
      onAdded();
    } catch (error) {
      if (!isLeadModuleDisabledError(error)) form.setError("root", { message: leadErrorMessage(error) });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-2" noValidate>
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Añadir una nota</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} maxLength={LEAD_NOTE_MAX} placeholder="Qué pasó en el contacto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {rootError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={addNote.isPending}>
            {addNote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar nota
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Línea de tiempo del prospecto (más reciente primero). Los mensajes de WhatsApp NO están
 * aquí: viven en la conversación de la bandeja. Cada evento se pinta de forma tolerante.
 */
export function LeadTimeline({ lead, permissions }: { lead: Lead; permissions: LeadPermissions }) {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useLeadActivity(lead.id, page, PAGE_SIZE);
  const events = data?.entities ?? [];

  return (
    <section className="bento space-y-4 p-5" aria-labelledby="lead-timeline-title">
      <h2 id="lead-timeline-title" className="text-base font-semibold text-ink">
        Línea de tiempo
      </h2>

      {permissions.canCreate && <NoteBox lead={lead} onAdded={() => setPage(0)} />}

      {isPending ? (
        <LinesSkeleton lines={5} label="Cargando actividad…" />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{leadErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : events.length === 0 ? (
        <p className="text-sm text-subtle">Todavía no hay actividad registrada.</p>
      ) : (
        <ol className="space-y-0">
          {events.map((event) => {
            const { title, detail } = describeLeadActivity(event, formatLeadDateTime);
            return (
              <li key={event.id} className="relative border-l border-hairline pb-4 pl-4 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />
                <p className="text-sm font-medium text-ink">{title}</p>
                {detail && <p className="whitespace-pre-wrap break-words text-sm text-ink/90">{detail}</p>}
                <p className="text-xs text-subtle">
                  {leadActorLabel(event)} · {formatLeadDateTime(event.occurredAt)}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <BillingPager pagination={data?.pagination} onPageChange={setPage} noun="eventos" />
    </section>
  );
}
