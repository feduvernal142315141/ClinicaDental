"use client";

import { X, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/primitives/shadcn/dialog";
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

/**
 * EditPatientDrawer — edición del paciente sin salir de la historia clínica.
 *
 * Modal CENTRADO (antes era un panel lateral). El contenido es el
 * `PatientForm` compartido, el mismo que usa la página `/patients/{id}/edit`:
 * no hay un segundo formulario de paciente y los campos nuevos (foto, estado)
 * aparecen aquí sin tocar este archivo. Lo único propio del modal es el pie,
 * porque `PatientForm` se monta con `hideActions` y el envío se dispara desde
 * fuera por ref.
 */
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] gap-0 overflow-hidden border-hairline bg-surface p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-hairline px-6 py-4 text-left">
          <DialogTitle className="text-ink">Editar paciente</DialogTitle>
          <DialogDescription className="text-subtle">
            Actualiza la información del paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
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

        <DialogFooter className="flex-row justify-end gap-2 border-t border-hairline px-6 py-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
