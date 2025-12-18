import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, App } from "antd";
import { useDoctors } from "@/lib/hooks/doctors";
import type {
  CreateDoctorRequest,
  UpdateDoctorRequest,
  Doctor,
} from "@/lib/entity/doctors";

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
          form.setFieldsValue({
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
            licenceNumber: doctor.licenceNumber,
            specialty: doctor.specialty,
            gender: doctor.gender,
            description: doctor.description,
            schedule: doctor.schedule, // Already an object from backend
            roleId: doctor.roleId,
            active: doctor.active,
          });
        }
      });
    } else if (initialData) {
      form.setFieldsValue({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        licenceNumber: initialData.licenceNumber,
        specialty: initialData.specialty,
        gender: initialData.gender,
        description: initialData.description,
        schedule: initialData.schedule, // Already an object from backend
        roleId: initialData.roleId,
        active: initialData.active,
      });
    }
  }, [isEdit, doctorId, initialData, getDoctorById, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        // ⭐ IMPORTANT: Send schedule as object (Spring Boot handles conversion)
        const scheduleData =
          values.schedule && typeof values.schedule === "object"
            ? values.schedule
            : undefined;

        if (isEdit && doctorId) {
          const updateData: UpdateDoctorRequest = {
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty,
            gender: values.gender,
            description: values.description,
            schedule: scheduleData, // JSON object (NOT stringified)
            roleId: values.roleId,
            active: values.active,
          };

          const success = await updateDoctor(doctorId, updateData);
          if (success) {
            message.success("Doctor actualizado correctamente");
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
            schedule: scheduleData, // JSON object (NOT stringified)
            roleId: values.roleId,
            active: values.active ?? true,
          };

          const newDoctorId = await createDoctor(createData);
          if (newDoctorId) {
            message.success("Doctor creado correctamente");
            router.push(basePath);
          }
        }
      } catch (error) {
        message.error("Error al guardar doctor");
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
