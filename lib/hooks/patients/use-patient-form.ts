"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Direct import to avoid circular dependency through the barrel index.ts
import { usePatients } from "@/lib/hooks/patients/usePatients";
import {
  patientFormSchema,
  type PatientFormValues,
} from "@/lib/entity/patients";
import type { Patient } from "@/lib/entity/patients";

interface UsePatientFormParams {
  patientId?: string;
  basePath?: string;
  initialData?: Patient;
  onSuccess?: () => void;
  onCancel?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * usePatientForm — lógica de negocio del formulario de paciente (crear / editar).
 *
 * Migrado a react-hook-form + zod. El formulario (UseFormReturn) se crea
 * internamente y se expone al componente junto con los handlers.
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
  const isEdit = !!patientId;

  const { createPatient, updatePatient, getPatientById, loading } =
    usePatients();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: undefined,
      address: "",
      agreement: true,
    },
  });

  // Prefill sincrónico cuando se pasa initialData (ej: EditPatientDrawer)
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name ?? "",
        email: initialData.email ?? "",
        phone: initialData.phone ?? "",
        dateOfBirth: initialData.dateOfBirth ?? "",
        address: initialData.address ?? "",
        gender: initialData.gender,
        agreement: initialData.agreement ?? true,
      });
    }
  }, [initialData, form]);

  // Carga desde la API cuando se edita sin initialData
  useEffect(() => {
    if (isEdit && patientId && !initialData) {
      getPatientById(patientId).then((patient) => {
        if (patient) {
          form.reset({
            name: patient.name ?? "",
            email: patient.email ?? "",
            phone: patient.phone ?? "",
            dateOfBirth: patient.dateOfBirth ?? "",
            address: patient.address ?? "",
            gender: patient.gender,
            agreement: patient.agreement ?? true,
          });
        }
      });
    }
  }, [isEdit, patientId, initialData, getPatientById, form]);

  // Propaga el estado loading al padre (p. ej. EditPatientDrawer)
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const handleSubmit = useCallback(
    async (values: PatientFormValues) => {
      try {
        if (isEdit && patientId) {
          const success = await updatePatient({
            id: patientId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            dateOfBirth: values.dateOfBirth,
            address: values.address,
            gender: values.gender,
            agreement: values.agreement,
          });
          if (success) {
            if (onSuccess) onSuccess();
            else router.push(`${basePath}/${patientId}`);
          }
        } else {
          const newPatientId = await createPatient({
            name: values.name,
            email: values.email,
            phone: values.phone,
            dateOfBirth: values.dateOfBirth,
            address: values.address,
            gender: values.gender,
            agreement: values.agreement ?? true,
          });
          if (newPatientId) {
            if (onSuccess) onSuccess();
            else router.push(basePath);
          }
        }
      } catch {
        // El toast de error ya fue mostrado por usePatients (createPatient / updatePatient).
        // Solo prevenimos que el rechazo no manejado rompa el componente.
      }
    },
    [isEdit, patientId, createPatient, updatePatient, router, basePath, onSuccess],
  );

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (isEdit && patientId) {
      router.push(`${basePath}/${patientId}`);
    } else {
      router.push(basePath);
    }
  }, [router, basePath, isEdit, patientId, onCancel]);

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
