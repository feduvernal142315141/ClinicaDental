import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs, { type Dayjs } from "dayjs";
import { useAppointments } from "@/lib/hooks/appointments/useAppointments";
import { usePatients } from "@/lib/hooks/patients";
import { patientsService } from "@/lib/services/patients";
import { doctorsService } from "@/lib/services/doctors";
import { servicesService } from "@/lib/services/services";
import {
  buildDisabledDate,
  isDoctorWorkingDay,
} from "@/lib/utils/appointment-utils";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/hooks/appointments/appointment-form.schema";
import type {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/lib/entity/appointment";
import type { CreatePatientRequest } from "@/lib/entity/patients";
import type { WeekSchedule } from "@/lib/entity/schedule";
import { isSchedulableType, type ServiceType } from "@/lib/entity/services";
import { useClinicGeneralSettings } from "@/lib/hooks/settings/use-clinic-general-settings";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";

export type { AppointmentFormValues } from "@/lib/hooks/appointments/appointment-form.schema";

export interface SelectOption {
  id: string;
  label: string;
}

export interface AppointmentFormPrefill {
  doctorId?: string;
  patientId?: string;
  date?: string;
  time?: string;
  interval?: number;
}

interface UseAppointmentFormParams {
  appointmentId?: string;
  basePath?: string;
  initialData?: Appointment;
  prefill?: AppointmentFormPrefill;
}

type CreateQuickPatientValues = Required<
  Pick<CreatePatientRequest, "name" | "phone" | "dateOfBirth" | "gender">
> &
  Pick<CreatePatientRequest, "email" | "address" | "agreement">;

const DEFAULT_VALUES: AppointmentFormValues = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  duration: 30,
  type: "consultation",
  reason: "",
  notes: "",
  serviceIds: [],
  labelIds: [],
};

function normalizeDate(value?: string): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

export function useAppointmentForm({
  appointmentId,
  basePath = "/appointments",
  initialData,
  prefill,
}: UseAppointmentFormParams) {
  const router = useRouter();
  const isEdit = useMemo(() => !!appointmentId, [appointmentId]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });
  const { watch, setValue, reset } = form;

  const {
    loading,
    createAppointment,
    updateAppointment,
    getAppointmentById,
    getDoctorAvailability,
  } = useAppointments();
  const {
    createPatient: createPatientFromPatientsModule,
    loading: patientCreationLoading,
  } = usePatients();

  const [patientsOptions, setPatientsOptions] = useState<SelectOption[]>([]);
  const [doctorsOptions, setDoctorsOptions] = useState<SelectOption[]>([]);
  const [servicesOptions, setServicesOptions] = useState<SelectOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [doctorSchedule, setDoctorSchedule] = useState<
    WeekSchedule | Record<string, unknown> | null
  >(null);

  // Horario EFECTIVO = doctor ∩ clínica (paridad con el backend).
  const { rawSchedule: clinicSchedule } = useClinicGeneralSettings();

  // Catálogo de servicios (id → datos) para auto-dimensionar la cita y para
  // poder mostrar/quitar en edición servicios ya asignados aunque hoy estén
  // inactivos o sean de un tipo no agendable.
  const serviceCatalogRef = useRef<
    Map<
      string,
      {
        code: string;
        name: string;
        duration?: number;
        type: ServiceType;
        active: boolean;
      }
    >
  >(new Map());

  // Catálogo id → etiqueta de doctor (incluye inactivos) para poder mostrar en
  // edición el doctor ya asignado aunque hoy esté inactivo (no sale en el Select).
  const doctorCatalogRef = useRef<Map<string, string>>(new Map());

  /** Etiqueta "Nombre - especialidad" de un doctor del catálogo (para edición). */
  const getDoctorLabel = useCallback(
    (id: string): string | undefined => doctorCatalogRef.current.get(id),
    [],
  );

  /** Etiqueta "CÓDIGO - Nombre" de un servicio del catálogo (para chips en edición). */
  const getServiceLabel = useCallback((id: string): string | undefined => {
    const s = serviceCatalogRef.current.get(id);
    return s ? `${s.code} - ${s.name}` : undefined;
  }, []);

  /** Suma de duraciones de los servicios seleccionados (undefined si ninguno la define). */
  const getSuggestedDuration = useCallback(
    (ids: string[]): number | undefined => {
      let sum = 0;
      let any = false;
      for (const id of ids) {
        const d = serviceCatalogRef.current.get(id)?.duration;
        if (typeof d === "number" && d > 0) {
          sum += d;
          any = true;
        }
      }
      return any ? sum : undefined;
    },
    [],
  );

  const watchedDoctorId = watch("doctorId");
  const watchedDate = watch("date");
  const watchedDuration = watch("duration");

  /** `disabledDate` para el calendario según el horario EFECTIVO (doctor ∩ clínica). */
  const disabledDate = useMemo(
    () => buildDisabledDate(doctorSchedule, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );

  /** Predicado para resaltar los días que el doctor atiende (efectivo). */
  const isWorkingDay = useCallback(
    (date: Dayjs) => isDoctorWorkingDay(doctorSchedule, date, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );

  /** ¿El doctor atiende en la fecha seleccionada? (para el estado vacío de slots) */
  const selectedDayWorked = useMemo(() => {
    if (!watchedDate) return undefined;
    return isDoctorWorkingDay(doctorSchedule, dayjs(watchedDate), clinicSchedule);
  }, [doctorSchedule, clinicSchedule, watchedDate]);

  // Limpiar la hora seleccionada cuando cambian doctor, fecha o duración:
  // un slot válido para una combinación no lo es necesariamente para otra.
  // Solo limpia si ANTES ya había un doctor/fecha real (evita borrar la hora
  // al precargar una cita en edición o al aplicar el prefill).
  const prevSelectionRef = useRef<{
    doctorId?: string;
    date?: string;
    duration?: number;
  }>({});
  useEffect(() => {
    const prev = prevSelectionRef.current;
    const hadSelection = Boolean(prev.doctorId) || Boolean(prev.date);
    const changed =
      prev.doctorId !== watchedDoctorId ||
      prev.date !== watchedDate ||
      prev.duration !== watchedDuration;
    if (hadSelection && changed) {
      setValue("time", "");
    }
    prevSelectionRef.current = {
      doctorId: watchedDoctorId,
      date: watchedDate,
      duration: watchedDuration,
    };
  }, [watchedDoctorId, watchedDate, watchedDuration, setValue]);

  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [patientsResponse, doctorsResponse, servicesResponse] =
        await Promise.all([
          patientsService.getPatients({ page: 0, pageSize: 100 }),
          // Proveedor de cita: el BACKEND resuelve qué tipos de usuario
          // atienden citas (endpoint semántico `onlyProviders`); el front
          // nunca envía la lista de tipos.
          doctorsService.getDoctors({
            page: 0,
            pageSize: 100,
            onlyProviders: true,
          }),
          servicesService.getServices({ page: 0, pageSize: 200 }),
        ]);

      setPatientsOptions(
        (patientsResponse.entities ?? []).map((item) => ({
          id: item.id,
          label: `${item.name}${item.email ? ` - ${item.email}` : ""}`,
        })),
      );
      const doctorEntities = doctorsResponse.entities ?? [];
      // Catálogo completo id → etiqueta (incluye inactivos) para resolver en
      // edición el doctor ya asignado aunque hoy esté inactivo.
      doctorCatalogRef.current = new Map(
        doctorEntities.map((item) => [
          item.id,
          `${item.name}${item.specialty ? ` - ${item.specialty}` : ""}`,
        ]),
      );
      // En el selector solo ofrecemos doctores activos: el BACKEND ya
      // restringe la lista a proveedores (tipo con `attendsAppointments=true`)
      // vía `onlyProviders`, así que aquí solo filtramos por `active` (un
      // doctor inactivo no puede recibir nuevas citas, espeja el filtro de
      // los servicios). `doctorCatalogRef` arriba SÍ conserva el catálogo
      // completo (incluye inactivos) para poder seguir resolviendo en edición
      // un proveedor ya asignado que hoy no aparecería como opción nueva.
      setDoctorsOptions(
        doctorEntities
          .filter((item) => item.active)
          .map((item) => ({
            id: item.id,
            label: `${item.name}${item.specialty ? ` - ${item.specialty}` : ""}`,
          })),
      );
      // Mapa completo id → datos para sugerir duración y resolver etiquetas.
      serviceCatalogRef.current = new Map(
        (servicesResponse.entities ?? []).map((item) => [
          item.id,
          {
            code: item.code,
            name: item.name,
            duration: item.duration,
            type: item.type,
            active: item.active,
          },
        ]),
      );
      // En el selector de citas solo ofrecemos tipos agendables (no PRODUCT/ADVANCE).
      setServicesOptions(
        (servicesResponse.entities ?? [])
          .filter((item) => item.active && isSchedulableType(item.type))
          .map((item) => ({
            id: item.id,
            label: `${item.code} - ${item.name}`,
          })),
      );
    } catch (error) {
      notifyApiError("No se pudieron cargar los datos del formulario", error);
      setPatientsOptions([]);
      setDoctorsOptions([]);
      setServicesOptions([]);
    } finally {
      setCatalogsLoading(false);
    }
  }, []);

  const loadAppointment = useCallback(async () => {
    if (!isEdit || !appointmentId) return;

    const appointment =
      initialData ??
      (await getAppointmentById(appointmentId).catch((error) => {
        notifyApiError("No se pudo cargar la cita", error);
        return null;
      }));

    if (!appointment) return;

    reset({
      ...DEFAULT_VALUES,
      patientId: appointment.patientId ?? appointment.patient_id ?? "",
      doctorId: appointment.doctorId ?? appointment.doctor_id ?? "",
      date: normalizeDate(appointment.date),
      time: appointment.time ?? "",
      duration: appointment.duration ?? 30,
      type: appointment.type,
      reason: appointment.reason ?? "",
      notes: appointment.notes ?? "",
      serviceIds:
        appointment.services && appointment.services.length > 0
          ? appointment.services
              .map((s) => s.serviceId)
              .filter((id): id is string => !!id)
          : appointment.serviceId
            ? [appointment.serviceId]
            : [],
      labelIds: Array.isArray(appointment.labels)
        ? appointment.labels.map((l) => l.id)
        : [],
    });
  }, [isEdit, appointmentId, initialData, getAppointmentById, reset]);

  const applyPrefill = useCallback(() => {
    if (isEdit || !prefill) return;

    if (prefill.patientId) setValue("patientId", prefill.patientId);
    if (prefill.doctorId) setValue("doctorId", prefill.doctorId);
    if (prefill.date) setValue("date", normalizeDate(prefill.date));
    if (prefill.time) setValue("time", prefill.time);
  }, [isEdit, prefill, setValue]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Cargar schedule del doctor cuando cambia la selección.
  useEffect(() => {
    if (!watchedDoctorId) {
      setDoctorSchedule(null);
      return;
    }

    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const doctor = await doctorsService.getDoctorById(watchedDoctorId);
        if (!cancelled) {
          setDoctorSchedule(
            (doctor.schedule as WeekSchedule | Record<string, unknown>) ?? null,
          );
        }
      } catch (error) {
        if (!cancelled) {
          notifyApiError("No se pudo cargar el horario del doctor", error);
          setDoctorSchedule(null);
        }
      }
    };

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [watchedDoctorId]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    applyPrefill();
  }, [applyPrefill]);

  useEffect(() => {
    const run = async () => {
      if (!watchedDoctorId || !watchedDate) {
        setAvailableTimes([]);
        return;
      }

      setAvailabilityLoading(true);
      try {
        const times = await getDoctorAvailability(
          watchedDoctorId,
          watchedDate,
          15,
          watchedDuration || 30,
        );
        setAvailableTimes(times);
      } catch (error) {
        notifyApiError("No se pudieron cargar los horarios disponibles", error);
        setAvailableTimes([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    run();
  }, [watchedDoctorId, watchedDate, watchedDuration, getDoctorAvailability]);

  const handleSubmit = useCallback(
    async (values: AppointmentFormValues) => {
      const serviceIds = (values.serviceIds ?? []).filter(
        (id): id is string => !!id,
      );
      const labelIds = (values.labelIds ?? []).filter(
        (id): id is string => !!id,
      );
      const payloadBase = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        date: values.date,
        time: values.time,
        duration: Number(values.duration),
        type: values.type,
        reason: values.reason || undefined,
        notes: values.notes || undefined,
        serviceIds,
        serviceId: serviceIds[0],
        labelIds,
      };

      if (isEdit && appointmentId) {
        const payload: UpdateAppointmentRequest = payloadBase;
        try {
          const updated = await updateAppointment(appointmentId, payload);
          if (updated) {
            notify.success("Cita actualizada", {
              description:
                "Los cambios de la cita se guardaron. Revisa los detalles actualizados.",
            });
            router.push(`${basePath}/${appointmentId}`);
          }
        } catch (error) {
          notifyApiError("No se pudo actualizar la cita", error);
        }
        return;
      }

      const payload: CreateAppointmentRequest = {
        ...payloadBase,
        status: "scheduled",
      };

      try {
        const createdId = await createAppointment(payload);
        if (createdId) {
          notify.success("Cita agendada", {
            description:
              "La cita se creó correctamente y ya aparece en la agenda.",
          });
          router.push(basePath);
        }
      } catch (error) {
        notifyApiError("No se pudo agendar la cita", error);
      }
    },
    [
      appointmentId,
      basePath,
      createAppointment,
      isEdit,
      router,
      updateAppointment,
    ],
  );

  const handleCancel = useCallback(() => {
    if (isEdit && appointmentId) {
      router.push(`${basePath}/${appointmentId}`);
      return;
    }

    router.push(basePath);
  }, [appointmentId, basePath, isEdit, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const createQuickPatient = useCallback(
    async (values: CreateQuickPatientValues) => {
      const payload: CreatePatientRequest = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        address: values.address,
        agreement: values.agreement ?? true,
      };

      try {
        const patientId = await createPatientFromPatientsModule(payload);
        if (!patientId) return null;

        const newOption = {
          id: patientId,
          label: `${values.name}${values.email ? ` - ${values.email}` : ""}`,
        };

        setPatientsOptions((prev) =>
          prev.some((item) => item.id === patientId)
            ? prev
            : [newOption, ...prev],
        );

        setValue("patientId", patientId);

        return patientId;
      } catch {
        // usePatients.createPatient ya mostró el toast con el mensaje del backend.
        // Devolvemos null para que el modal mantenga el formulario abierto y NO
        // se dispare el toast genérico global (unhandledrejection).
        return null;
      }
    },
    [createPatientFromPatientsModule, setValue],
  );

  return {
    form,
    isEdit,
    loading,
    patientCreationLoading,
    catalogsLoading,
    availabilityLoading,
    patientsOptions,
    doctorsOptions,
    servicesOptions,
    availableTimes,
    disabledDate,
    isWorkingDay,
    doctorSchedule,
    clinicSchedule,
    selectedDayWorked,
    getSuggestedDuration,
    getServiceLabel,
    getDoctorLabel,
    handleSubmit,
    handleCancel,
    handleBack,
    createQuickPatient,
  };
}
