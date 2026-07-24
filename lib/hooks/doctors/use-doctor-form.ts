import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDoctors } from "@/lib/hooks/doctors";
import { useUserTypes } from "@/lib/hooks/userTypes";
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
import type { ClinicSchedule } from "@/lib/entity/settings";
import type { UserTypeRef } from "@/lib/entity/userType";
import { deriveProviderUserTypeIds } from "@/lib/entity/userType";

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
  /**
   * Horario global de la clínica: acota el horario específico del doctor
   * (mismo concepto que la disponibilidad de citas acotada por el horario
   * del doctor). Lo carga e inyecta `DoctorForm` (vía `useClinicGeneralSettings`)
   * para que este hook no vuelva a montar el fetch (evita doble llamada).
   * `undefined`/`null` ⇒ aún no cargó o no aplica ⇒ el esquema no acota.
   * Parcial a propósito: los días que la clínica nunca configuró están
   * ausentes ⇒ ese día no se acota (paridad con el backend).
   */
  clinicSchedule?: Partial<ClinicSchedule> | null;
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
  clinicSchedule = null,
}: UseDoctorFormParams) {
  const router = useRouter();
  const isEdit = !!doctorId;

  const { createDoctor, updateDoctor, getDoctorById, loading } = useDoctors();

  // Catálogo GESTIONABLE de tipos de usuario (solo activos): reemplaza el
  // enum hardcodeado. Se centraliza aquí (capa hook) porque tanto el resolver
  // (especialidad condicional) como el Select de `DoctorForm` lo necesitan.
  const { userTypes, loading: userTypesLoading } = useUserTypes();

  // Tipo asignado al doctor en edición, tal como lo resuelve el backend
  // (`{ id, name, attendsAppointments }`). Puede estar ARCHIVADO (fuera de
  // `userTypes`) — se conserva aparte para no perderlo del Select ni de la
  // validación de especialidad.
  const [assignedUserType, setAssignedUserType] = useState<UserTypeRef | null>(
    null,
  );

  // ids del catálogo con `attendsAppointments=true` (+ el asignado, aunque
  // esté archivado) — sustituye la comparación contra `CLINICAL_USER_TYPES`.
  const providerTypeIds = useMemo(() => {
    const ids = deriveProviderUserTypeIds(userTypes);
    if (assignedUserType?.attendsAppointments) ids.add(assignedUserType.id);
    return ids;
  }, [userTypes, assignedUserType]);

  const resolver = useMemo(
    () =>
      zodResolver(
        makeDoctorFormSchema(requireRole, clinicSchedule, providerTypeIds),
      ),
    [requireRole, clinicSchedule, providerTypeIds],
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
      // Sin default hardcodeado: se preselecciona el tipo proveedor del
      // catálogo (ver efecto más abajo) en cuanto carga; en edición se
      // prellena con el valor existente (ver `prefill`).
      userTypeId: "",
      description: "",
      avatarUrl: "",
      roleId: "",
      active: true,
      schedule: DEFAULT_WEEK_SCHEDULE as unknown as ScheduleShape,
    },
  });
  const { reset, getValues, setValue } = form;

  // Alta (create): preseleccionar un tipo proveedor por defecto en cuanto
  // carga el catálogo (paridad UX con el antiguo default "DENTISTA"), sin
  // pisar una elección ya hecha por el usuario. Preferimos "Dentista" por
  // nombre (mismo default que el backfill del backend); si no existe, el
  // primer tipo con `attendsAppointments=true`.
  useEffect(() => {
    if (isEdit || userTypes.length === 0) return;
    if (getValues("userTypeId")) return;
    const preferred =
      userTypes.find((t) => t.name === "Dentista" && t.attendsAppointments) ??
      userTypes.find((t) => t.attendsAppointments) ??
      userTypes[0];
    if (preferred) setValue("userTypeId", preferred.id);
  }, [isEdit, userTypes, getValues, setValue]);

  const prefill = useCallback(
    (doctor: Doctor) => {
      setAssignedUserType(doctor.userType ?? null);
      reset({
        name: doctor.name ?? "",
        email: doctor.email ?? "",
        phone: doctor.phone ?? "",
        licenceNumber: doctor.licenceNumber ?? "",
        specialty: doctor.specialty ?? "",
        gender: doctor.gender,
        userTypeId: doctor.userTypeId ?? doctor.userType?.id ?? "",
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
            userTypeId: values.userTypeId,
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
            userTypeId: values.userTypeId || undefined,
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
    // Catálogo de tipos de usuario (activos) + tipo asignado (aunque esté
    // archivado): `DoctorForm` los usa para poblar el Select y para derivar
    // si la especialidad es obligatoria.
    userTypes,
    userTypesLoading,
    assignedUserType,
  };
}
