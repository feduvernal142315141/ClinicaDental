"use client";

import { X, Save, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/primitives/shadcn/sheet";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { PatientForm } from "@/components/features/patients/form/PatientForm";
import type { Patient } from "@/lib/entity/patients";
import { useEditPatientDrawer } from "@/lib/hooks/patients/clinical-history-page/use-edit-patient-drawer";

interface EditPatientDrawerProps {
  open: boolean;
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPatientDrawer({
  open,
  patient,
  onClose,
  onSuccess,
}: EditPatientDrawerProps) {
  const {
    formRef,
    saving,
    handleClose,
    handleSubmit,
    handleLoadingChange,
    handleSuccess,
  } = useEditPatientDrawer({
    onClose,
    onSuccess,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 border-hairline bg-surface p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-hairline px-6 py-4">
          <SheetTitle className="text-ink">Editar paciente</SheetTitle>
          <SheetDescription className="text-subtle">
            Actualiza la información del paciente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <PatientForm
            ref={formRef}
            patientId={patient.id}
            initialData={patient}
            compact
            hideActions
            onLoadingChange={handleLoadingChange}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-hairline px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            icon={<X className="size-4" />}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
            disabled={saving}
            icon={
              saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )
            }
          >
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
