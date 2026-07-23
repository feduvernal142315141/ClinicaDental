import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDoctors } from "@/lib/hooks/doctors";
import { notifyApiError } from "@/lib/utils/notify-error";
import { applyServerErrorToFields } from "@/lib/validation/server-errors";
import { DEFAULT_WEEK_SCHEDULE } from "@/lib/entity/schedule";
import {
  makeDoctorFormSchema,
  type DoctorFormValues,
} from "@/lib/hooks/doctors/doctor-form.schema";
import type {
  CreateDoctorRequest,
  UpdateDoctorRequest,
  Doctor,
} from "@/lib/entity/doctors";

export type { DoctorFormValues } from "@/lib/hooks/doctors/doctor-form.schema";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type ScheduleShape = DoctorFormValues["schedule"];

/**
 * Backend → frontend. Compatibilidad legacy: si el día existe sin `enabled`,
 * se asume habilitado; si no existe, deshabilitado. (Lógica preservada.)
 */
const transformScheduleFromBackend = (
  backendSchedule: unknown,
): Record<string, unknown> => {
  if (!backendSchedule || typeof backendSchedule !== "object") {
    return DEFAULT_WEEK_SCHEDULE as unknown as Record<string, unknown>;
  }

  const source = backendSchedule as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};

  DAYS_OF_WEEK.forEach((day) => {
    const value = source[day];
    if (value) {
      const enabled =
        typeof value.enabled === "boolean" ? value.enabled : true; // legacy: presencia ⇒ habilitado
      result[day] = {
        enabled,
        startTime: (value.startTime as string) || "09:00",
        endTime: (value.endTime as string) || "18:00",
        breakStart: (value.breakStart as string) || "13:00",
        breakEnd: (value.breakEnd as string) || "14:00",
      };
    } else {
      result[day] = {
        enabled: false,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      };
    }
  });

  return result;
};

/**
 * Frontend → backend. Envía los 7 días con `enabled` explícito. (Preservado.)
 */
const transformScheduleToBackend = (
  frontendSchedule: unknown,
): Record<string, unknown> => {
  if (!frontendSchedule || typeof frontendSchedule !== "object") return {};

  const source = frontendSchedule as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};

  DAYS_OF_WEEK.forEach((day) => {
    const d = source[day];
    result[day] = {
      enabled: Boolean(d?.enabled),
      startTime: (d?.startTime as string) || "09:00",
      endTime: (d?.endTime as string) || "18:00",
      breakStart: (d?.breakStart as string) || "13:00",
      breakEnd: (d?.breakEnd as string) || "14:00",
    };
  });

  return result;
};

interface UseDoctorFormParams {
  doctorId?: string;
  basePath?: string;
  initialData?: Doctor;
  /** Exigir rol (false en "Mi perfil", donde no se muestra la sección Acceso). */
  requireRole?: boolean;
}

/**
 * useDoctorForm — lógica del formulario de doctor (alta/edición) con
 * react-hook-form + zod. El formulario NO captura contraseña (flujo OTP).
 */
export function useDoctorForm({
  doctorId,
  basePath = "/settings/doctors",
  initialData,
  requireRole = true,
}: UseDoctorFormParams) {
  const router = useRouter();
  const isEdit = !!doctorId;

  const { createDoctor, updateDoctor, getDoctorById, loading } = useDoctors();

  const resolver = useMemo(
    () => zodResolver(makeDoctorFormSchema(requireRole)),
    [requireRole],
  );

  const form = useForm<DoctorFormValues>({
    resolver,
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      licenceNumber: "",
      specialty: "",
      gender: undefined,
      description: "",
      avatarUrl: "",
      roleId: "",
      active: true,
      schedule: DEFAULT_WEEK_SCHEDULE as unknown as ScheduleShape,
    },
  });
  const { reset } = form;

  const prefill = useCallback(
    (doctor: Doctor) => {
      reset({
        name: doctor.name ?? "",
        email: doctor.email ?? "",
        phone: doctor.phone ?? "",
        licenceNumber: doctor.licenceNumber ?? "",
        specialty: doctor.specialty ?? "",
        gender: doctor.gender,
        description: doctor.description ?? "",
        avatarUrl: doctor.avatarUrl ?? "",
        // Fallback a role.id por si el detalle no trae roleId top-level.
        roleId:
          doctor.roleId ??
          (doctor as { role?: { id?: string } }).role?.id ??
          "",
        active: doctor.active ?? true,
        schedule: transformScheduleFromBackend(
          doctor.schedule,
        ) as unknown as ScheduleShape,
      });
    },
    [reset],
  );

  // Cargar datos en edición.
  useEffect(() => {
    if (isEdit && doctorId && !initialData) {
      getDoctorById(doctorId).then((doctor) => {
        if (doctor) prefill(doctor);
      });
    } else if (initialData) {
      prefill(initialData);
    }
  }, [isEdit, doctorId, initialData, getDoctorById, prefill]);

  const handleSubmit = useCallback(
    async (values: DoctorFormValues) => {
      try {
        const scheduleData = transformScheduleToBackend(values.schedule);

        if (isEdit && doctorId) {
          // En UPDATE se envían los strings opcionales crudos (como HEAD) para
          // permitir VACIAR un campo existente ("" en vez de omitir la clave).
          const updateData: UpdateDoctorRequest = {
            id: doctorId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            // El esquema normaliza "" -> undefined (optionalText); se restaura ""
            // aquí para preservar el contrato de UPDATE: permitir VACIAR el campo
            // enviando cadena vacía en vez de omitir la clave.
            specialty: values.specialty ?? "",
            gender: values.gender,
            description: values.description ?? "",
            avatarUrl: values.avatarUrl,
            schedule: scheduleData,
            roleId: values.roleId,
            active: values.active,
          };

          const updated = await updateDoctor(doctorId, updateData);
          if (updated) router.push(basePath);
        } else {
          const createData: CreateDoctorRequest = {
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty || undefined,
            gender: values.gender,
            description: values.description || undefined,
            avatarUrl: values.avatarUrl || undefined,
            schedule: scheduleData,
            roleId: values.roleId,
            active: values.active ?? true,
          };

          const newDoctor = await createDoctor(createData);
          if (newDoctor) router.push(basePath);
        }
      } catch (error) {
        // Además del toast, marcar en rojo los campos citados en el error de
        // negocio del backend (p.ej. doctor duplicado por licencia/correo/nombre).
        applyServerErrorToFields(error, form.setError, [
          {
            field: "licenceNumber",
            value: values.licenceNumber,
            message: "Ya existe un doctor con este número de licencia.",
          },
          {
            field: "email",
            value: values.email,
            message: "Ya existe un doctor con este correo electrónico.",
          },
          {
            field: "name",
            value: values.name,
            message: "Ya existe un doctor con este nombre.",
          },
        ]);
        notifyApiError(
          isEdit
            ? "No se pudo actualizar el doctor"
            : "No se pudo crear el doctor",
          error,
        );
      }
    },
    [isEdit, doctorId, createDoctor, updateDoctor, router, basePath, form],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    form,
    isEdit,
    loading,
    handleSubmit,
    handleCancel,
    handleBack,
  };
}
