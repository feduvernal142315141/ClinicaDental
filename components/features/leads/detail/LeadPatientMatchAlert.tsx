"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserSearch } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { LEAD_MATCHED_BY_LABELS, type Lead, type LeadPatientMatch } from "@/lib/entity/leads";
import { useResolvePatientMatch, type LeadPermissions } from "@/lib/hooks/leads";
import { useAlert } from "@/lib/contexts/alert-context";
import { notify } from "@/lib/utils/notify";
import { notifyLeadError } from "../shared/lead-notify";

interface LeadPatientMatchAlertProps {
  lead: Lead;
  matches: LeadPatientMatch[];
  permissions: LeadPermissions;
  /** Reservar directamente para el paciente existente (`existingPatientId` en `/book`). */
  onBookForPatient: (patient: LeadPatientMatch) => void;
}

/**
 * Aviso de posible paciente existente. Nada se fusiona solo y el frontend nunca decide por la
 * persona: quien tiene `leads_manage` confirma que es ese paciente o descarta la coincidencia.
 */
export function LeadPatientMatchAlert({ lead, matches, permissions, onBookForPatient }: LeadPatientMatchAlertProps) {
  const resolve = useResolvePatientMatch();
  const { showConfirm } = useAlert();
  const [pending, setPending] = useState<string | null>(null);

  const run = async (key: string, data: Parameters<typeof resolve.mutateAsync>[0]["data"], success: string) => {
    setPending(key);
    try {
      await resolve.mutateAsync({ id: lead.id, data });
      notify.success(success);
    } catch (error) {
      notifyLeadError(error, "No se pudo resolver la coincidencia");
    } finally {
      setPending(null);
    }
  };

  const confirm = (patient: LeadPatientMatch) =>
    showConfirm({
      title: "¿Es este paciente?",
      description: `El prospecto se cerrará como "Ya era paciente" y quedará enlazado a ${patient.name ?? "este paciente"}.`,
      confirmText: "Sí, es este paciente",
      onConfirm: () => void run(patient.patientId, { decision: "CONFIRM", patientId: patient.patientId }, "Prospecto enlazado al paciente"),
    });

  const dismiss = () =>
    showConfirm({
      title: "¿Es otra persona?",
      description: "El prospecto seguirá abierto y podrá convertirse en un paciente nuevo.",
      confirmText: "Sí, es otra persona",
      onConfirm: () => void run("dismiss", { decision: "DISMISS" }, "Coincidencia descartada"),
    });

  const busy = pending !== null;

  return (
    <Alert variant="warning" live={false}>
      <UserSearch />
      <AlertTitle>Podría ser un paciente existente</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Mientras no se resuelva, no se puede reservar ni convertir como paciente nuevo.
          {!permissions.canManage && " Pide a alguien con permiso de gestión que lo revise."}
        </p>
        <ul className="space-y-2">
          {matches.map((patient) => (
            <li
              key={patient.patientId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface p-3 text-ink"
            >
              <div className="min-w-0 text-sm">
                <Link href={`/patients/${patient.patientId}`} className="font-semibold hover:text-brand">
                  {patient.name ?? "Paciente"}
                </Link>
                <p className="text-xs text-subtle">
                  {[patient.phone, patient.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </p>
                <p className="text-xs text-subtle">Coincide por: {LEAD_MATCHED_BY_LABELS[patient.matchedBy] ?? patient.matchedBy}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.canEdit && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onBookForPatient(patient)}>
                    Reservar cita para este paciente
                  </Button>
                )}
                {permissions.canManage && (
                  <Button size="sm" disabled={busy} onClick={() => confirm(patient)}>
                    {pending === patient.patientId && <Loader2 className="h-4 w-4 animate-spin" />}
                    Es este paciente
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {matches.length === 0 && <p className="text-sm">No se pudieron cargar los candidatos. Recarga la página.</p>}
        {permissions.canManage && (
          <Button size="sm" variant="outline" disabled={busy} onClick={dismiss}>
            {pending === "dismiss" && <Loader2 className="h-4 w-4 animate-spin" />}
            Es otra persona
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
