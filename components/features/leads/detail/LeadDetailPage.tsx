"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CalendarPlus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  SearchX,
  UserCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { DetailSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import { LinkButton } from "@/components/features/billing/shared/LinkButton";
import { useAlert } from "@/lib/contexts/alert-context";
import {
  LEAD_CONSENT_LABELS,
  LEAD_CONVERSION_METHOD_LABELS,
  LEAD_LOST_REASON_LABELS,
  hasPendingPatientMatch,
  isLeadClosed,
  isLeadOpen,
  leadDisplayName,
  leadSourceLabel,
  type Lead,
  type LeadConsentStatus,
  type LeadPatientMatch,
} from "@/lib/entity/leads";
import {
  optionName,
  useArchiveLead,
  useLeadDetail,
  useLeadPermissions,
  useLeadUserOptions,
  useReopenLead,
  useSetLeadConsent,
} from "@/lib/hooks/leads";
import { hasLeadErrorCode, isLeadApiError, isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { AssignLeadDialog } from "../dialogs/AssignLeadDialog";
import { BookLeadDialog } from "../dialogs/BookLeadDialog";
import { ConvertLeadDialog } from "../dialogs/ConvertLeadDialog";
import { LeadFormDialog } from "../dialogs/LeadFormDialog";
import { LoseLeadDialog } from "../dialogs/LoseLeadDialog";
import { LeadMatchFlag, LeadOverdueFlag, LeadStatusBadge, LeadTemperatureTag } from "../shared/LeadBadges";
import { formatLeadDateTime } from "../shared/lead-format";
import { notifyLeadError } from "../shared/lead-notify";
import { LeadFollowUps } from "./LeadFollowUps";
import { LeadPatientMatchAlert } from "./LeadPatientMatchAlert";
import { LeadTimeline } from "./LeadTimeline";

const MATCH_BLOCK_REASON = "Primero resuelve si es un paciente existente";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-brand">
      <ArrowLeft className="h-4 w-4" />
      Adquisición de pacientes
    </Link>
  );
}

/** Ficha del prospecto. */
export function LeadDetailPage({ leadId }: { leadId: string }) {
  const router = useRouter();
  const permissions = useLeadPermissions();
  const { showConfirm } = useAlert();
  const { data, isPending, isError, error } = useLeadDetail(leadId);
  const users = useLeadUserOptions();
  const reopen = useReopenLead();
  const archive = useArchiveLead();
  const consent = useSetLeadConsent();

  const [editing, setEditing] = useState(false);
  // Al archivar, la ficha deja de existir: no se anuncia como "no existe" mientras se sale.
  const [archived, setArchived] = useState(false);
  const [assigning, setAssigning] = useState<Lead | null>(null);
  const [losing, setLosing] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [booking, setBooking] = useState<{ lead: Lead; patient: LeadPatientMatch | null } | null>(null);

  const notFound = isLeadApiError(error) && (error.kind === "not-found" || hasLeadErrorCode(error, "LEAD_NOT_FOUND"));
  useEffect(() => {
    if (notFound && !archived) notify.error("El prospecto no existe");
  }, [notFound, archived]);

  if (archived) return <DetailSkeleton label="Archivando…" />;
  if (isPending) return <DetailSkeleton label="Cargando prospecto…" />;

  if (isError || !data) {
    if (isLeadModuleDisabledError(error)) return null;
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={SearchX}
          variant="card"
          title={notFound ? "El prospecto no existe" : "No se pudo cargar el prospecto"}
          description={notFound ? "Puede que se haya archivado o que el enlace no sea correcto." : leadErrorMessage(error)}
          action={<LinkButton href="/leads">Volver a la lista</LinkButton>}
        />
      </div>
    );
  }

  const { lead, followUps, patientMatches } = data;
  const name = leadDisplayName(lead);
  const open = isLeadOpen(lead);
  const closed = isLeadClosed(lead);
  const pendingMatch = hasPendingPatientMatch(lead);
  const linkedPatientId = lead.patientId ?? (lead.outcome === "EXISTING_PATIENT" ? lead.matchedPatientId : null);

  const canEdit = open && permissions.canEdit;
  const canManageOpen = open && permissions.canManage;
  const canReopen = closed && permissions.canManage;
  const hasMoreActions = canManageOpen || permissions.canArchive;

  const doReopen = async () => {
    try {
      await reopen.mutateAsync(lead.id);
      notify.success("Prospecto reabierto");
    } catch (err) {
      notifyLeadError(err, "No se pudo reabrir");
    }
  };

  const doArchive = () =>
    showConfirm({
      title: "¿Archivar este prospecto?",
      description: `«${name}» desaparecerá del tablero y de todas las listas.`,
      confirmText: "Archivar",
      onConfirm: async () => {
        setArchived(true);
        try {
          await archive.mutateAsync(lead.id);
          notify.success("Prospecto archivado");
          router.push("/leads");
        } catch (err) {
          setArchived(false);
          notifyLeadError(err, "No se pudo archivar");
        }
      },
    });

  // No se infiere consentimiento: solo se registra cuando la persona lo expresa.
  const registerConsent = (status: Exclude<LeadConsentStatus, "UNKNOWN">) =>
    showConfirm({
      title: status === "OPTED_IN" ? "¿La persona aceptó recibir comunicaciones?" : "¿La persona no quiere recibir comunicaciones?",
      description: "Regístralo solo si la persona lo dijo de forma expresa.",
      confirmText: status === "OPTED_IN" ? "Registrar que aceptó" : "Registrar que no acepta",
      onConfirm: async () => {
        try {
          await consent.mutateAsync({ id: lead.id, status });
          notify.success("Consentimiento registrado", { description: LEAD_CONSENT_LABELS[status] });
        } catch (err) {
          notifyLeadError(err, "No se pudo registrar el consentimiento");
        }
      },
    });

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-3xl font-bold tracking-tight text-ink">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <LeadStatusBadge lead={lead} />
            <LeadTemperatureTag temperature={lead.temperature} />
            <span className="text-sm text-subtle">
              Responsable: {optionName(users.data, lead.assignedToUserId) ?? (lead.assignedToUserId ? "Asignado" : "Sin asignar")}
            </span>
            {lead.overdueFollowUp && <LeadOverdueFlag />}
            {pendingMatch && <LeadMatchFlag />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              onClick={() => setBooking({ lead, patient: null })}
              disabled={pendingMatch}
              title={pendingMatch ? MATCH_BLOCK_REASON : undefined}
            >
              <CalendarPlus className="h-4 w-4" />
              Reservar cita
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          {canReopen && (
            <Button variant="outline" onClick={() => void doReopen()} disabled={reopen.isPending}>
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </Button>
          )}
          {hasMoreActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManageOpen && (
                  <>
                    <DropdownMenuItem onSelect={() => setAssigning(lead)}>
                      <UserCog className="h-4 w-4" />
                      Asignar responsable
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pendingMatch}
                      title={pendingMatch ? MATCH_BLOCK_REASON : undefined}
                      onSelect={() => setConverting(lead)}
                    >
                      <UserCheck className="h-4 w-4" />
                      Convertir sin cita
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLosing(lead)}>
                      <XCircle className="h-4 w-4" />
                      Cerrar prospecto
                    </DropdownMenuItem>
                  </>
                )}
                {canManageOpen && permissions.canArchive && <DropdownMenuSeparator />}
                {permissions.canArchive && (
                  <DropdownMenuItem onSelect={doArchive}>
                    <Archive className="h-4 w-4" />
                    Archivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {pendingMatch && (
        <LeadPatientMatchAlert
          lead={lead}
          matches={patientMatches ?? []}
          permissions={permissions}
          onBookForPatient={(patient) => setBooking({ lead, patient })}
        />
      )}

      {closed && (
        <Alert live={false}>
          <AlertTitle>
            {lead.outcome === "EXISTING_PATIENT" ? "Este prospecto ya era paciente" : "Este prospecto está cerrado"}
          </AlertTitle>
          <AlertDescription>
            {lead.outcome === "LOST" && lead.lostReason
              ? `Motivo: ${LEAD_LOST_REASON_LABELS[lead.lostReason] ?? lead.lostReason}. `
              : ""}
            {permissions.canManage
              ? "Para volver a trabajarlo, reábrelo."
              : "Para volver a trabajarlo, pide a alguien con permiso de gestión que lo reabra."}
          </AlertDescription>
        </Alert>
      )}

      {(lead.outcome === "CONVERTED" || linkedPatientId) && (
        <section className="bento space-y-3 p-5" aria-labelledby="lead-conversion-title">
          <h2 id="lead-conversion-title" className="text-base font-semibold text-ink">
            {lead.outcome === "CONVERTED" ? "Convertido en paciente" : "Paciente enlazado"}
          </h2>
          {lead.outcome === "CONVERTED" && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha de conversión">{formatLeadDateTime(lead.convertedAt)}</Field>
              <Field label="Método">
                {lead.conversionMethod ? LEAD_CONVERSION_METHOD_LABELS[lead.conversionMethod] ?? lead.conversionMethod : "—"}
              </Field>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            {linkedPatientId && <LinkButton href={`/patients/${linkedPatientId}`}>Ver paciente</LinkButton>}
            {lead.firstAppointmentId && (
              <LinkButton href={`/appointments/${lead.firstAppointmentId}`} variant="outline">
                Ver primera cita
              </LinkButton>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <section className="bento space-y-3 p-5" aria-labelledby="lead-contact-title">
            <h2 id="lead-contact-title" className="text-base font-semibold text-ink">
              Contacto
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Teléfono">
                {lead.phone ?? lead.phoneE164 ?? "—"}
                {(lead.phone || lead.phoneE164) && !lead.phoneVerified && (
                  <span className="block text-xs text-subtle">Número sin verificar</span>
                )}
              </Field>
              <Field label="Correo">{lead.email ?? "—"}</Field>
            </dl>
            {lead.conversationId && (
              <LinkButton href={`/inbox?conversation=${lead.conversationId}`} variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" />
                Ver conversación de WhatsApp
              </LinkButton>
            )}
          </section>

          <section className="bento space-y-3 p-5" aria-labelledby="lead-origin-title">
            <h2 id="lead-origin-title" className="text-base font-semibold text-ink">
              Origen e interés
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Origen">{leadSourceLabel(lead.source)}</Field>
              <Field label="Detalle del origen">{lead.sourceDetail ?? "—"}</Field>
              {lead.sourceCampaign && <Field label="Campaña">{lead.sourceCampaign}</Field>}
              <Field label="Servicio de interés">{lead.interestServiceName ?? "—"}</Field>
              <div className="sm:col-span-2">
                <Field label="Nota de interés">
                  <span className="whitespace-pre-wrap">{lead.interestNote ?? "—"}</span>
                </Field>
              </div>
              <Field label="Registrado">
                {formatLeadDateTime(lead.createdAt)}
                {lead.createdBy ? ` · ${lead.createdBy}` : ""}
              </Field>
            </dl>
          </section>

          <section className="bento space-y-3 p-5" aria-labelledby="lead-consent-title">
            <h2 id="lead-consent-title" className="text-base font-semibold text-ink">
              Consentimiento de marketing
            </h2>
            <p className="text-sm text-ink">
              <span className="font-medium">{LEAD_CONSENT_LABELS[lead.consentStatus] ?? lead.consentStatus}</span>
              {lead.consentAt && <span className="text-subtle"> · {formatLeadDateTime(lead.consentAt)}</span>}
            </p>
            {permissions.canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={consent.isPending || lead.consentStatus === "OPTED_IN"}
                  onClick={() => registerConsent("OPTED_IN")}
                >
                  Aceptó
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={consent.isPending || lead.consentStatus === "OPTED_OUT"}
                  onClick={() => registerConsent("OPTED_OUT")}
                >
                  No acepta
                </Button>
              </div>
            )}
            <p className="text-xs text-subtle">Solo se registra cuando la persona lo expresa.</p>
          </section>
        </div>

        <div className="space-y-6">
          <LeadFollowUps lead={lead} followUps={followUps ?? []} permissions={permissions} />
          <LeadTimeline lead={lead} permissions={permissions} />
        </div>
      </div>

      <LeadFormDialog open={editing} onOpenChange={setEditing} lead={lead} />
      <AssignLeadDialog lead={assigning} onOpenChange={(next) => !next && setAssigning(null)} />
      <LoseLeadDialog lead={losing} onOpenChange={(next) => !next && setLosing(null)} />
      <ConvertLeadDialog lead={converting} onOpenChange={(next) => !next && setConverting(null)} />
      <BookLeadDialog
        lead={booking?.lead ?? null}
        existingPatient={booking?.patient}
        onOpenChange={(next) => !next && setBooking(null)}
      />
    </div>
  );
}
