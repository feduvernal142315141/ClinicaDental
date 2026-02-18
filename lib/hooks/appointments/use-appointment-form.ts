import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Form } from "antd";
import { useAppointments } from "@/lib/hooks/appointments/useAppointments";
import { usePatients } from "@/lib/hooks/patients";
import { patientsService } from "@/lib/services/patients";
import { doctorsService } from "@/lib/services/doctors";
import type {
  Appointment,
  AppointmentType,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/lib/entity/appointment";
import type { CreatePatientRequest } from "@/lib/entity/patients";

type AppointmentFormValues = {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  reason?: string;
  notes?: string;
};

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
  Pick<CreatePatientRequest, "name" | "email" | "phone" | "dateOfBirth" | "gender">
> &
  Pick<CreatePatientRequest, "address" | "agreement">;

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.includes("T") ? value.split("T")[0] : value;
}

export function useAppointmentForm({
  appointmentId,
  basePath = "/appointments",
  initialData,
  prefill,
}: UseAppointmentFormParams) {
  const router = useRouter();
  const [form] = Form.useForm<AppointmentFormValues>();
  const isEdit = useMemo(() => !!appointmentId, [appointmentId]);

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
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const watchedDoctorId = Form.useWatch("doctorId", form);
  const watchedDate = Form.useWatch("date", form);

  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [patientsResponse, doctorsResponse] = await Promise.all([
        patientsService.getPatients({ page: 0, pageSize: 100 }),
        doctorsService.getDoctors({ page: 0, pageSize: 100 }),
      ]);

      const patientItems = (patientsResponse.entities ?? []).map((item) => ({
        id: item.id,
        label: `${item.name}${item.email ? ` - ${item.email}` : ""}`,
      }));

      const doctorItems = (doctorsResponse.entities ?? []).map((item) => ({
        id: item.id,
        label: `${item.name}${item.specialty ? ` - ${item.specialty}` : ""}`,
      }));

      setPatientsOptions(patientItems);
      setDoctorsOptions(doctorItems);
    } catch {
      setPatientsOptions([]);
      setDoctorsOptions([]);
    } finally {
      setCatalogsLoading(false);
    }
  }, []);

  const loadAppointment = useCallback(async () => {
    if (!isEdit || !appointmentId) return;

    const appointment =
      initialData ?? (await getAppointmentById(appointmentId).catch(() => null));

    if (!appointment) return;

    form.setFieldsValue({
      patientId: appointment.patientId ?? appointment.patient_id ?? "",
      doctorId: appointment.doctorId ?? appointment.doctor_id ?? "",
      date: normalizeDate(appointment.date),
      time: appointment.time,
      duration: appointment.duration,
      type: appointment.type,
      reason: appointment.reason,
      notes: appointment.notes,
    });
  }, [isEdit, appointmentId, initialData, getAppointmentById, form]);

  const applyPrefill = useCallback(() => {
    if (isEdit || !prefill) return;

    const values: Partial<AppointmentFormValues> = {};

    if (prefill.patientId) {
      values.patientId = prefill.patientId;
    }

    if (prefill.doctorId) {
      values.doctorId = prefill.doctorId;
    }

    if (prefill.date) {
      values.date = normalizeDate(prefill.date);
    }

    if (prefill.time) {
      values.time = prefill.time;
    }

    if (Object.keys(values).length > 0) {
      form.setFieldsValue(values);
    }
  }, [form, isEdit, prefill]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

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
        const times = await getDoctorAvailability(watchedDoctorId, watchedDate);
        setAvailableTimes(times);
      } catch {
        setAvailableTimes([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    run();
  }, [watchedDoctorId, watchedDate, getDoctorAvailability]);

  const handleSubmit = useCallback(
    async (values: AppointmentFormValues) => {
      const payloadBase = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        date: values.date,
        time: values.time,
        duration: Number(values.duration),
        type: values.type,
        reason: values.reason,
        notes: values.notes,
      };

      if (isEdit && appointmentId) {
        const payload: UpdateAppointmentRequest = payloadBase;
        const updated = await updateAppointment(appointmentId, payload);
        if (updated) {
          router.push(`${basePath}/${appointmentId}`);
        }
        return;
      }

      const payload: CreateAppointmentRequest = {
        ...payloadBase,
        status: "scheduled",
      };

      const createdId = await createAppointment(payload);
      if (createdId) {
        router.push(basePath);
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

      const patientId = await createPatientFromPatientsModule(payload);
      if (!patientId) return null;

      const newOption = {
        id: patientId,
        label: `${values.name}${values.email ? ` - ${values.email}` : ""}`,
      };

      setPatientsOptions((prev) => {
        if (prev.some((item) => item.id === patientId)) {
          return prev;
        }
        return [newOption, ...prev];
      });

      form.setFieldValue("patientId", patientId);

      return patientId;
    },
    [createPatientFromPatientsModule, form],
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
    availableTimes,
    handleSubmit,
    handleCancel,
    handleBack,
    createQuickPatient,
  };
}
