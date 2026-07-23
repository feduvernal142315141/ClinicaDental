"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requiredId } from "@/lib/validation/fields";
import { Stethoscope } from "lucide-react";
import { Modal as CustomModal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { Select } from "@/components/ui/controls/select";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { doctorsService } from "@/lib/services/doctors/doctors.service";
import { notifyApiError } from "@/lib/utils/notify-error";
import type { Doctor } from "@/lib/entity/doctors";

const startConsultationSchema = z.object({
  doctorId: requiredId("El doctor"),
  reason: z.string().max(500).optional(),
});

type StartConsultationFormValues = z.infer<typeof startConsultationSchema>;

interface StartConsultationNowModalProps {
  open: boolean;
  patientId: string;
  onClose: () => void;
  onStarted: (appointmentId: string) => void;
}

export function StartConsultationNowModal({
  open,
  patientId,
  onClose,
  onStarted,
}: StartConsultationNowModalProps) {
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const form = useForm<StartConsultationFormValues>({
    resolver: zodResolver(startConsultationSchema),
    mode: "onBlur",
    defaultValues: {
      doctorId: "",
      reason: "",
    },
  });
  const { errors } = form.formState;
  const reasonValue = form.watch("reason") ?? "";

  // Load doctors when modal opens
  useEffect(() => {
    if (!open) return;
    setDoctorsLoading(true);
    doctorsService
      .getDoctors({ pageSize: 100 })
      .then((result) => {
        setDoctors(result?.entities ?? []);
      })
      .catch((error) => {
        notifyApiError("No se pudieron cargar los doctores", error);
        setDoctors([]);
      })
      .finally(() => setDoctorsLoading(false));
  }, [open]);

  const close = useCallback(() => {
    if (loading) return;
    form.reset();
    onClose();
  }, [loading, form, onClose]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      const result = await appointmentsService.startNowAppointment({
        patientId,
        doctorId: values.doctorId,
        reason: values.reason || undefined,
      });
      form.reset();
      onStarted(result.appointmentId);
    } catch (error) {
      // Notificamos el fallo y mantenemos el modal abierto para reintentar.
      notifyApiError("No se pudo iniciar la consulta", error);
    } finally {
      setLoading(false);
    }
  });

  const doctorOptions = doctors.map((d) => ({
    value: d.id,
    label: d.specialty ? `${d.name} — ${d.specialty}` : d.name,
  }));

  return (
    <CustomModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      icon={<Stethoscope className="h-5 w-5" />}
      title="Nueva Consulta Express"
      description="Selecciona el doctor y registra el motivo para iniciar la consulta de inmediato."
      className="w-full sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Doctor <span className="text-rose-500">*</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={doctorOptions}
                    searchable
                    searchPlaceholder="Buscar doctor…"
                    placeholder={
                      doctorsLoading
                        ? "Cargando doctores…"
                        : "Seleccione un doctor"
                    }
                    disabled={loading || doctorsLoading}
                    aria-label="Doctor"
                    aria-invalid={!!errors.doctorId}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de consulta (opcional)</FormLabel>
                  <TextArea
                    rows={3}
                    placeholder="Ej: Dolor en molar inferior derecho"
                    maxLength={500}
                    disabled={loading}
                    aria-label="Motivo de consulta"
                    {...field}
                    value={field.value ?? ""}
                  />
                  <div className="text-right text-xs text-subtle">
                    {reasonValue.length}/500
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Iniciar Consulta
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}
