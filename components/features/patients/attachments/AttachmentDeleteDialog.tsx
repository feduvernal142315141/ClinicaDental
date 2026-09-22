"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import { displayFileName } from "@/lib/utils/attachment-helpers";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";

interface AttachmentDeleteDialogProps {
  attachment: PatientAttachment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function AttachmentDeleteDialog({
  attachment,
  open,
  onOpenChange,
  onConfirm,
}: AttachmentDeleteDialogProps) {
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="rounded-2xl border-hairline bg-surface shadow-bento"
        onClick={stop}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-ink">Eliminar archivo</AlertDialogTitle>
          <AlertDialogDescription className="text-subtle">
            Se eliminará{" "}
            <span className="font-medium text-ink">
              &ldquo;{displayFileName(attachment.fileName)}&rdquo;
            </span>{" "}
            del expediente del paciente. Si era un consentimiento firmado o una
            radiografía, dejará de estar disponible para cualquier consulta
            posterior y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={stop}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(event) => {
              event.stopPropagation();
              onConfirm(attachment.id);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
