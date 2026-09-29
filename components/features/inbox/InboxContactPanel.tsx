"use client";

import * as React from "react";
import { Calendar, Link2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/atomic/data-display/avatar";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import type { InboxConversationDetail } from "@/lib/entity/inbox";
import {
  CONVERSATION_STATUS_LABELS,
  HANDLING_MODE_LABELS,
} from "@/lib/entity/inbox";

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  // Expect HH:mm
  return timeStr.slice(0, 5);
}

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxContactPanelProps {
  detail: InboxConversationDetail | null;
  onLinkPatient: () => void;
  canEdit?: boolean;
  className?: string;
}

export function InboxContactPanel({
  detail,
  onLinkPatient,
  canEdit = false,
  className,
}: InboxContactPanelProps) {
  if (!detail) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <LoadingSpinner size="sm" message="Cargando contacto..." />
      </div>
    );
  }

  const {
    patientName,
    contactPhone,
    patientId,
    status,
    handlingMode,
    assignedTo,
    nextAppointmentDate,
    nextAppointmentTime,
    nextAppointmentDoctorName,
  } = detail;

  const displayName = patientName || contactPhone || "Contacto no registrado";
  const initials = patientName
    ? getInitials(patientName)
    : contactPhone
      ? contactPhone.slice(-2)
      : "?";
  const isRegistered = !!patientId;

  return (
    <div className={cn("flex h-full flex-col overflow-y-auto", className)}>
      {/* Contact header */}
      <div className="flex flex-col items-center border-b border-hairline px-4 py-6">
        <Avatar className="mb-3 size-16">
          <AvatarFallback className="bg-brand/10 text-brand text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-sm font-semibold text-ink">{displayName}</h3>
        {patientName && contactPhone && (
          <p className="mt-0.5 text-xs text-subtle">{contactPhone}</p>
        )}
        <p className="mt-1 text-xs text-subtle">
          {isRegistered ? "Paciente registrado" : "Contacto no registrado"}
        </p>
      </div>

      {/* Conversation section */}
      <div className="border-b border-hairline px-4 py-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
          Conversación
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-subtle">Estado</span>
            <StatusBadge
              tone={
                status === "NEEDS_HUMAN"
                  ? "warning"
                  : status === "RESOLVED"
                    ? "success"
                    : "neutral"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {CONVERSATION_STATUS_LABELS[status]}
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-subtle">Atención</span>
            <StatusBadge
              tone={handlingMode === "HUMAN" ? "info" : "neutral"}
              className="text-[10px] px-1.5 py-0"
            >
              {HANDLING_MODE_LABELS[handlingMode]}
            </StatusBadge>
          </div>
          {assignedTo && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-subtle">Asignado</span>
              <span className="text-xs text-ink">Miembro del equipo</span>
            </div>
          )}
        </div>
      </div>

      {/* Next appointment */}
      {nextAppointmentDate && (
        <div className="border-b border-hairline px-4 py-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
            Próxima cita
          </h4>
          <div className="flex items-start gap-3 rounded-xl bg-hover p-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-brand" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-ink">
                {formatDate(nextAppointmentDate)}
                {nextAppointmentTime && ` a las ${formatTime(nextAppointmentTime)}`}
              </p>
              {nextAppointmentDoctorName && (
                <p className="text-xs text-subtle">
                  Dr. {nextAppointmentDoctorName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-4 space-y-2">
        {isRegistered ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            block
            onClick={() => {
              window.open(`/patients/${patientId}`, "_blank");
            }}
          >
            <ExternalLink className="size-4" />
            Ver paciente
          </Button>
        ) : (
          canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              block
              onClick={onLinkPatient}
            >
              <Link2 className="size-4" />
              Vincular paciente
            </Button>
          )
        )}
      </div>
    </div>
  );
}
