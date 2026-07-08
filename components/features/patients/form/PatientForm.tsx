"use client";

import { forwardRef, useImperativeHandle } from "react";
import { Form } from "@/components/ui/atomic/forms";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import { usePatientForm } from "@/lib/hooks/patients";
import { PatientFormFields } from "./PatientFormFields";
import type { Patient } from "@/lib/entity/patients";

interface PatientFormProps {
  /** ID del paciente para edición (undefined en alta). */
  patientId?: string;
  /** Ruta base para navegación (default: "/patients"). */
  basePath?: string;
  /** Datos iniciales del paciente (modo edición). */
  initialData?: Patient;
  /** Modo solo lectura: muestra valores, oculta acciones. */
  readOnly?: boolean;
  /** Callback al guardar con éxito (reemplaza la navegación por router). */
  onSuccess?: () => void;
  /** Callback al cancelar (reemplaza la navegación por router). */
  onCancel?: () => void;
  /** Modo compacto: sin altura máxima en el contenedor. */
  compact?: boolean;
  /**
   * Oculta los botones de acción internos.
   * Úsalo cuando el padre (ej. EditPatientDrawer) provee sus propios botones
   * y llama a `ref.submit()` externamente.
   */
  hideActions?: boolean;
  /** Notifica cambios en el estado de carga (útil para EditPatientDrawer). */
  onLoadingChange?: (loading: boolean) => void;
}

/** Contrato público del ref expuesto por PatientForm. */
export interface PatientFormRef {
  /** Dispara la validación y el submit del formulario. */
  submit: () => void;
}

/**
 * PatientForm — Formulario de alta/edición de paciente.
 *
 * Migrado a react-hook-form + zod + Bento (sin Ant Design).
 * Expone `PatientFormRef.submit()` para su uso desde drawers externos.
 *
 * @example Alta
 * ```tsx
 * <PatientForm basePath="/patients" />
 * ```
 *
 * @example Edición dentro de un Drawer
 * ```tsx
 * <PatientForm
 *   ref={formRef}
 *   patientId={patient.id}
 *   initialData={patient}
 *   hideActions
 *   onLoadingChange={setSaving}
 *   onSuccess={handleClose}
 * />
 * ```
 */
export const PatientForm = forwardRef<PatientFormRef, PatientFormProps>(
  function PatientForm(
    {
      patientId,
      basePath = "/patients",
      initialData,
      readOnly = false,
      onSuccess,
      onCancel,
      compact = false,
      hideActions = false,
      onLoadingChange,
    },
    ref,
  ) {
    const { form, isEdit, loading, handleSubmit, handleCancel } =
      usePatientForm({
        patientId,
        basePath,
        initialData,
        onSuccess,
        onCancel,
        onLoadingChange,
      });

    const formDisabled = loading || readOnly;

    // Expone submit() para padres que controlan el envío externamente (EditPatientDrawer).
    useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(handleSubmit)(),
    }));

    const fields = <PatientFormFields disabled={formDisabled} />;

    const actions = !hideActions && !readOnly && (
      <div className="flex justify-end pt-2">
        <FormActions
          loading={loading}
          onCancel={handleCancel}
          submitText={isEdit ? "Actualizar" : "Guardar"}
        />
      </div>
    );

    if (hideActions) {
      // Sin wrapper de card: el drawer padre provee el chrome visual.
      return (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
            noValidate
          >
            {fields}
          </form>
        </Form>
      );
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className={compact ? "space-y-4" : "space-y-5"}
          noValidate
        >
          <section className="bento space-y-5 p-6">
            <h3 className="text-sm font-semibold text-ink">
              Información del paciente
            </h3>
            {fields}
            {actions}
          </section>
        </form>
      </Form>
    );
  },
);
