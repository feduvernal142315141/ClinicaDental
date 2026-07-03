"use client";

import { useState } from "react";
import { Loader2, Paperclip, FileX2, Plus } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { notify } from "@/lib/utils/notify";
import { AttachmentCard } from "./AttachmentCard";
import { AttachmentUploadModal } from "./AttachmentUploadModal";

interface PatientAttachmentsSectionProps {
  patientId: string;
  canUpload: boolean;
  canDelete: boolean;
  activeAppointmentId?: string;
}

export function PatientAttachmentsSection({
  patientId,
  canUpload,
  canDelete,
  activeAppointmentId,
}: PatientAttachmentsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { attachments, loading, uploading, upload, remove } = usePatientAttachments(patientId);

  const handleUpload = async (file: File, category: AttachmentCategory, notes?: string) => {
    try {
      await upload(file, category, notes, activeAppointmentId);
      void notify.success("Archivo subido", {
        description: "El adjunto ya está disponible en la ficha del paciente.",
      });
    } catch {
      void notify.error("No se pudo subir el archivo", {
        description:
          "Revisa tu conexión y el tamaño del archivo, e inténtalo de nuevo; si persiste, contacta a soporte.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      void notify.success("Archivo eliminado", {
        description: "El adjunto ya no aparece en la ficha del paciente.",
      });
    } catch {
      void notify.error("No se pudo eliminar el archivo", {
        description:
          "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    }
  };

  // Agrupar por categoría (solo las que tienen ítems)
  const grouped = ATTACHMENT_CATEGORIES.map((cat) => ({
    ...cat,
    items: attachments.filter((a) => a.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Paperclip className="h-4 w-4" />
          <span>Archivos</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-elevated px-1.5 py-0.5 text-xs text-subtle">
              {attachments.length}
            </span>
          )}
        </div>
        {canUpload && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-4" aria-label="Cargando archivos...">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hairline py-6 text-center">
          <FileX2 className="h-6 w-6 text-subtle" />
          <p className="text-xs text-subtle">Sin archivos adjuntos</p>
          {canUpload && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-7 gap-1 px-3 text-xs"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Subir primer archivo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.value} className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                {group.label}
              </p>
              {group.items.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  patientId={patientId}
                  onDelete={handleDelete}
                  canDelete={canDelete}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <AttachmentUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
        appointmentId={activeAppointmentId}
      />
    </div>
  );
}
