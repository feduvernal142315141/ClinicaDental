"use client";

import { useState } from "react";
import { AlertTriangle, CalendarX2 } from "lucide-react";
import dayjs from "dayjs";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { useCancelAppointment } from "@/lib/hooks/appointments/use-cancel-appointment";
import type { CancellationReasonCode } from "@/lib/entity/appointment";

interface CancelModalProps {
  appointment: {
    id: string;
    patientName?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    date?: string;
    time?: string;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCEL_REASONS: { label: string; value: CancellationReasonCode }[] = [
  { label: "Paciente canceló", value: "PATIENT_CANCELLED" },
  { label: "Urgencia / conflicto del doctor", value: "DOCTOR_CONFLICT" },
  { label: "Reprogramación solicitada", value: "RESCHEDULE_REQUEST" },
  { label: "No se presentó el paciente", value: "NO_SHOW" },
  { label: "Otro", value: "OTHER" },
];

function formatAppointmentTime(appt: CancelModalProps["appointment"]): string {
  if (appt.scheduledStartAt) {
    const d = dayjs(appt.scheduledStartAt);
    return d.format("HH:mm · ddd DD MMM YYYY");
  }
  if (appt.date && appt.time) {
    return `${appt.time} · ${dayjs(appt.date).format("ddd DD MMM YYYY")}`;
  }
  return "—";
}

export function CancelModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CancelModalProps) {
  const [reasonCode, setReasonCode] = useState<
    CancellationReasonCode | undefined
  >();
  const [freeText, setFreeText] = useState("");

  const { cancel, loading } = useCancelAppointment(appointment.id, {
    onSuccess: () => {
      setReasonCode(undefined);
      setFreeText("");
      onSuccess();
      onClose();
    },
  });

  const isInProgress = appointment.status === "in_progress";

  const handleOk = async () => {
    await cancel({
      reasonCode,
      reason: reasonCode === "OTHER" ? freeText || undefined : undefined,
    });
  };

  const handleCancel = () => {
    setReasonCode(undefined);
    setFreeText("");
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
      icon={<CalendarX2 className="h-5 w-5" />}
      title="Cancelar cita"
      className="w-full sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={handleCancel}>
            Volver
          </Button>
          <Button
            variant="destructive"
            type="button"
            onClick={handleOk}
            loading={loading}
          >
            Sí, cancelar cita
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {isInProgress && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              La cita está en curso
            </p>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-300/90">
              El doctor ya inició esta cita. ¿Desea cancelarla de todos modos?
            </p>
          </div>
        )}

        <div className="rounded-xl border border-hairline bg-elevated px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-subtle">Paciente</span>
            <span className="font-medium text-ink">
              {appointment.patientName ?? "—"}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="text-subtle">Cita</span>
            <span className="font-medium text-ink">
              {formatAppointmentTime(appointment)}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Motivo de cancelación{" "}
            <span className="font-normal text-subtle">(opcional)</span>
          </p>

          <RadioGroup
            value={reasonCode}
            onValueChange={(value) =>
              setReasonCode(value as CancellationReasonCode)
            }
          >
            {CANCEL_REASONS.map((r) => (
              <label
                key={r.value}
                htmlFor={`cancel-reason-${r.value}`}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-ink"
              >
                <RadioGroupItem
                  id={`cancel-reason-${r.value}`}
                  value={r.value}
                />
                {r.label}
              </label>
            ))}
          </RadioGroup>

          {reasonCode === "OTHER" && (
            <div className="mt-3">
              <TextArea
                rows={2}
                placeholder="Describe el motivo..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                maxLength={300}
                aria-label="Motivo de cancelación"
              />
              <div className="mt-1 text-right text-xs text-subtle">
                {freeText.length}/300
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
