import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form } from "antd";
import { usePatients } from "@/lib/hooks/patients";
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
  Patient,
} from "@/lib/entity/patients";

interface UsePatientFormParams {
  patientId?: string;
  basePath?: string;
  initialData?: Patient;
  onSuccess?: () => void;
  onCancel?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * usePatientForm Hook
 *
 * Manages all business logic for patient form (create/edit)
 */
export function usePatientForm({
  patientId,
  basePath = "/patients",
  initialData,
  onSuccess,
  onCancel,
  onLoadingChange,
}: UsePatientFormParams) {
  const router = useRouter();
  const [form] = Form.useForm();

  const isEdit = !!patientId;

  const { createPatient, updatePatient, getPatientById, loading } =
    usePatients();

  // Load patient data if editing
  useEffect(() => {
    if (isEdit && patientId && !initialData) {
      getPatientById(patientId).then((patient) => {
        if (patient) {
          form.setFieldsValue({
            name: patient.name,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth,
            address: patient.address,
            gender: patient.gender,
            agreement: patient.agreement,
          });
        }
      });
    } else if (initialData) {
      form.setFieldsValue({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        dateOfBirth: initialData.dateOfBirth,
        address: initialData.address,
        gender: initialData.gender,
        agreement: initialData.agreement,
      });
    }
  }, [isEdit, patientId, initialData, getPatientById, form]);

  // Notify loading changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: unknown) => {
      try {
        if (isEdit && patientId) {
          const updateData: UpdatePatientRequest = {
            id: patientId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            dateOfBirth: values.dateOfBirth,
            address: values.address,
            gender: values.gender,
            agreement: values.agreement,
          };

          const success = await updatePatient(updateData);
          if (success) {
            if (onSuccess) onSuccess();
            else router.push(`${basePath}/${patientId}`);
          }
        } else {
          const createData: CreatePatientRequest = {
            name: values.name,
            email: values.email,
            phone: values.phone,
            dateOfBirth: values.dateOfBirth,
            address: values.address,
            gender: values.gender,
            agreement: values.agreement ?? true,
          };

          const newPatientId = await createPatient(createData);
          if (newPatientId) {
            if (onSuccess) onSuccess();
            else router.push(basePath);
          }
        }
      } catch (error: unknown) {
        console.error("Error in handleSubmit:", error);
      }
    },
    [isEdit, patientId, createPatient, updatePatient, router, basePath, onSuccess],
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (isEdit && patientId) {
      router.push(`${basePath}/${patientId}`);
    } else {
      router.push(basePath);
    }
  }, [router, basePath, isEdit, patientId, onCancel]);

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
