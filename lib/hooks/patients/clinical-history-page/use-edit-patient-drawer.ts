"use client";

import { useCallback, useRef, useState } from "react";
import type { PatientFormRef } from "@/components/features/patients/form/PatientForm";

interface UseEditPatientDrawerParams {
  onClose: () => void;
  onSuccess: () => void;
}

export function useEditPatientDrawer({
  onClose,
  onSuccess,
}: UseEditPatientDrawerParams) {
  const formRef = useRef<PatientFormRef>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const handleLoadingChange = useCallback((value: boolean) => {
    setSaving(value);
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  return {
    formRef,
    saving,
    handleClose: onClose,
    handleSubmit,
    handleLoadingChange,
    handleSuccess,
  };
}
