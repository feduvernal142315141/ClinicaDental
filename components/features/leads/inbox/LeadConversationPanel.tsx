"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ExternalLink, Loader2, UserPlus } from "lucide-react";
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
import { LinkButton } from "@/components/features/billing/shared/LinkButton";
import type { Lead } from "@/lib/entity/leads";
import {
  LEAD_NOTE_MAX,
  LEAD_SHORT_TEXT_MAX,
  leadFromConversationSchema,
  type LeadFromConversationValues,
} from "@/lib/entity/leads/schemas";
import {
  useLeadAccess,
  useLeadByConversation,
  useLeadFromConversation,
  useLeadServiceOptions,
} from "@/lib/hooks/leads";
import { hasLeadErrorCode, isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { LeadMatchFlag, LeadOverdueFlag, LeadStatusBadge, LeadTemperatureTag } from "../shared/LeadBadges";
import { formatLeadDateTime } from "../shared/lead-format";

const NONE = "__none__";

interface LeadConversationPanelProps {
  conversationId: string;
  /** La conversación ya es de un paciente: no se ofrece convertirla en prospecto. */
  hasPatient: boolean;
}

/**
 * Bloque "Prospecto" del panel de contacto de la bandeja de WhatsApp.
 * Se desactiva solo: sin el módulo LEAD_CRM o sin permiso sobre `leads` no pinta nada ni
 * hace ninguna llamada, así que la bandeja queda exactamente igual que antes.
 */
export function LeadConversationPanel({ conversationId, hasPatient }: LeadConversationPanelProps) {
  const { visible, permissions } = useLeadAccess();
  const { data, isPending, isError } = useLeadByConversation(conversationId, visible);
  const [promoting, setPromoting] = useState(false);

  if (!visible || isError) return null;
  const lead = data?.lead ?? null;
  // Sin prospecto y sin nada que ofrecer (ya es paciente, o sin permiso de crear): no hay bloque.
  if (!isPending && !lead && (hasPatient || !permissions.canCreate)) return null;

  return (
    <div className="border-b border-hairline px-4 py-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">Prospecto</h4>
      {isPending ? (
        <div className="h-4 w-32 animate-pulse rounded bg-hover" role="status" aria-label="Cargando prospecto" />
      ) : lead ? (
        <LeadSummary lead={lead} />
      ) : (
        <>
          <p className="mb-2 text-xs text-subtle">Este contacto todavía es solo una conversación.</p>
          <Button type="button" variant="outline" size="sm" block onClick={() => setPromoting(true)}>
            <UserPlus className="size-4" />
            Convertir en prospecto
          </Button>
        </>
      )}
      <PromoteConversationDialog conversationId={conversationId} open={promoting} onOpenChange={setPromoting} />
    </div>
  );
}

function LeadSummary({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <LeadStatusBadge lead={lead} className="px-1.5 py-0 text-[10px]" />
        <LeadTemperatureTag temperature={lead.temperature} />
      </div>
      {lead.interestServiceName && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-subtle">Interés</span>
          <span className="truncate text-xs text-ink">{lead.interestServiceName}</span>
        </div>
      )}
      {lead.nextFollowUpAt && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-subtle">Próximo seguimiento</span>
          <span className="text-xs text-ink">{formatLeadDateTime(lead.nextFollowUpAt)}</span>
        </div>
      )}
      {(lead.overdueFollowUp || lead.patientMatchStatus === "POSSIBLE") && (
        <div className="flex flex-wrap gap-1.5">
          {lead.overdueFollowUp && <LeadOverdueFlag />}
          {lead.patientMatchStatus === "POSSIBLE" && <LeadMatchFlag />}
        </div>
      )}
      <LinkButton href={`/leads/${lead.id}`} variant="outline" size="sm" className="w-full">
        <ExternalLink className="size-4" />
        Ver ficha del prospecto
      </LinkButton>
    </div>
  );
}

function PromoteConversationDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const services = useLeadServiceOptions(open);
  const promote = useLeadFromConversation();
  const form = useForm<LeadFromConversationValues>({
    resolver: zodResolver(leadFromConversationSchema),
    mode: "onBlur",
    defaultValues: { fullName: "", interestServiceId: "", interestNote: "" },
  });

  useEffect(() => {
    if (open) form.reset({ fullName: "", interestServiceId: "", interestNote: "" });
  }, [open, conversationId, form]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      const { created } = await promote.mutateAsync({
        conversationId,
        fullName: values.fullName || undefined,
        interestServiceId: values.interestServiceId || undefined,
        interestNote: values.interestNote || undefined,
      });
      // Idempotente: llamarla dos veces devuelve el mismo prospecto con `created: false`.
      notify.success(created ? "Prospecto creado" : "Esta conversación ya tenía un prospecto");
      onOpenChange(false);
    } catch (error) {
      if (isLeadModuleDisabledError(error)) return onOpenChange(false);
      form.setError("root", {
        message: hasLeadErrorCode(error, "LEAD_CONVERSATION_HAS_PATIENT")
          ? "Esta conversación ya es de un paciente"
          : leadErrorMessage(error),
      });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={(next) => !promote.isPending && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Convertir en prospecto</DialogTitle>
          <DialogDescription className="text-subtle">
            Da seguimiento a este contacto hasta su primera cita. Todos los campos son opcionales.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={LEAD_SHORT_TEXT_MAX} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interestServiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio de interés</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value || NONE}
                      onChange={(value) => field.onChange(value === NONE ? "" : value)}
                      options={[
                        { value: NONE, label: "Sin definir" },
                        ...(services.data ?? []).map((service) => ({ value: service.id, label: service.name })),
                      ]}
                      searchable
                      searchPlaceholder="Buscar servicio…"
                      aria-label="Servicio de interés"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interestNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={LEAD_NOTE_MAX} placeholder="Qué busca la persona" />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={promote.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={promote.isPending}>
                {promote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Convertir en prospecto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
