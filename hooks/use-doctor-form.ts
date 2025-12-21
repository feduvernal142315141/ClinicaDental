import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, App } from "antd";
import { useDoctors } from "@/lib/hooks/doctors";
import { DEFAULT_WEEK_SCHEDULE } from "@/lib/entity/schedule";
import type {
  CreateDoctorRequest,
  UpdateDoctorRequest,
  Doctor,
} from "@/lib/entity/doctors";

/**
 * Transform backend schedule to frontend format
 * Backend doesn't send 'enabled' field, we infer it from presence of the day
 */
const transformScheduleFromBackend = (backendSchedule: any): any => {
  if (!backendSchedule || typeof backendSchedule !== "object") {
    return DEFAULT_WEEK_SCHEDULE;
  }

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const transformedSchedule: any = {};

  daysOfWeek.forEach((day) => {
    if (backendSchedule[day]) {
      // Day exists in backend response - it's enabled
      transformedSchedule[day] = {
        enabled: true,
        startTime: backendSchedule[day].startTime || "09:00",
        endTime: backendSchedule[day].endTime || "18:00",
        breakStart: backendSchedule[day].breakStart || "13:00",
        breakEnd: backendSchedule[day].breakEnd || "14:00",
      };
    } else {
      // Day doesn't exist in backend response - it's disabled
      transformedSchedule[day] = {
        enabled: false,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      };
    }
  });

  return transformedSchedule;
};

/**
 * Transform frontend schedule to backend format
 * Backend doesn't expect 'enabled' field, only send enabled days
 */
const transformScheduleToBackend = (frontendSchedule: any): any => {
  if (!frontendSchedule || typeof frontendSchedule !== "object") {
    return {};
  }

  const backendSchedule: any = {};

  Object.keys(frontendSchedule).forEach((day) => {
    const daySchedule = frontendSchedule[day];

    // Only include enabled days in the backend payload
    if (daySchedule && daySchedule.enabled) {
      backendSchedule[day] = {
        startTime: daySchedule.startTime || "09:00",
        endTime: daySchedule.endTime || "18:00",
        breakStart: daySchedule.breakStart || "13:00",
        breakEnd: daySchedule.breakEnd || "14:00",
      };
    }
  });

  return backendSchedule;
};

interface UseDoctorFormParams {
  doctorId?: string;
  basePath?: string;
  initialData?: Doctor;
}

/**
 * useDoctorForm Hook
 *
 * Manages all business logic for doctor form (create/edit)
 */
export function useDoctorForm({
  doctorId,
  basePath = "/settings/doctors",
  initialData,
}: UseDoctorFormParams) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const isEdit = !!doctorId;

  const { createDoctor, updateDoctor, getDoctorById, loading } = useDoctors();

  // Load doctor data if editing
  useEffect(() => {
    if (isEdit && doctorId && !initialData) {
      getDoctorById(doctorId).then((doctor) => {
        if (doctor) {
          console.log("📥 Doctor data from backend:", doctor);
          console.log("📅 Raw schedule from backend:", doctor.schedule);

          // Transform schedule from backend format to frontend format
          const transformedSchedule = transformScheduleFromBackend(
            doctor.schedule
          );

          console.log("✨ Transformed schedule:", transformedSchedule);

          form.setFieldsValue({
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
            licenceNumber: doctor.licenceNumber,
            specialty: doctor.specialty,
            gender: doctor.gender,
            description: doctor.description,
            avatarUrl: doctor.avatarUrl,
            schedule: transformedSchedule,
            roleId: doctor.roleId,
            active: doctor.active,
          });
        }
      });
    } else if (initialData) {
      console.log("📥 Initial data provided:", initialData);
      console.log("📅 Raw schedule from initialData:", initialData.schedule);

      // Transform schedule from backend format to frontend format
      const transformedSchedule = transformScheduleFromBackend(
        initialData.schedule
      );

      console.log("✨ Transformed schedule:", transformedSchedule);

      form.setFieldsValue({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        licenceNumber: initialData.licenceNumber,
        specialty: initialData.specialty,
        gender: initialData.gender,
        description: initialData.description,
        avatarUrl: initialData.avatarUrl,
        schedule: transformedSchedule,
        roleId: initialData.roleId,
        active: initialData.active,
      });
    }
  }, [isEdit, doctorId, initialData, getDoctorById, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        console.log("📝 Form values:", values);
        console.log("📅 Schedule from form:", values.schedule);

        // Debug: Log each day's schedule in detail
        if (values.schedule) {
          Object.keys(values.schedule).forEach((day) => {
            console.log(`  ${day}:`, values.schedule[day]);
          });
        }

        // Transform schedule from frontend format to backend format
        // Use DEFAULT_WEEK_SCHEDULE if schedule is undefined or empty
        const scheduleData = transformScheduleToBackend(
          values.schedule || DEFAULT_WEEK_SCHEDULE
        );

        console.log("📤 Schedule to send (backend format):", scheduleData);

        if (isEdit && doctorId) {
          const updateData: UpdateDoctorRequest = {
            id: doctorId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty,
            gender: values.gender,
            description: values.description,
            avatarUrl: values.avatarUrl,
            schedule: scheduleData, // Backend format (no 'enabled' field, only enabled days)
            roleId: values.roleId,
            active: values.active,
          };

          console.log("📤 Update request payload:", updateData);

          const updatedDoctor = await updateDoctor(doctorId, updateData);
          if (updatedDoctor) {
            // El interceptor ya muestra el mensaje de éxito
            router.push(basePath);
          }
        } else {
          const createData: CreateDoctorRequest = {
            name: values.name,
            email: values.email,
            password: values.password,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty,
            gender: values.gender,
            description: values.description,
            avatarUrl: values.avatarUrl,
            schedule: scheduleData, // JSON object (NOT stringified)
            roleId: values.roleId,
            active: values.active ?? true,
          };

          const newDoctor = await createDoctor(createData);
          if (newDoctor) {
            // El interceptor ya muestra el mensaje de éxito (201)
            router.push(basePath);
          }
        }
      } catch (error: any) {
        console.error("❌ Error in handleSubmit:", error);
        // El interceptor ya muestra el mensaje de error
      }
    },
    [isEdit, doctorId, createDoctor, updateDoctor, message, router, basePath]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  // Handle back
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
