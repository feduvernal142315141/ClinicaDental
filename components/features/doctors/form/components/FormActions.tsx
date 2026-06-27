"use client";

import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";

/**
 * FormActions Component
 * Botones Guardar / Cancelar (Bento). Cancelar es NEUTRO (outline), no
 * destructivo — cancelar un formulario no destruye datos.
 */
interface FormActionsProps {
  /** Whether form is submitting */
  loading?: boolean;
  /** Cancel handler */
  onCancel: () => void;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
}

export function FormActions({
  loading = false,
  onCancel,
  submitText = "Guardar",
  cancelText = "Cancelar",
}: FormActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        {cancelText}
      </Button>
      <Button type="submit" loading={loading} className="gap-2">
        <Save className="h-4 w-4" />
        {submitText}
      </Button>
    </div>
  );
}
