"use client";

import { useState } from "react";
import { Spin, Button, message } from "antd";
import { Paperclip, FileX2, Plus } from "lucide-react";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { AttachmentCard } from "./AttachmentCard";
import { AttachmentUploadModal } from "./AttachmentUploadModal";

interface PatientAttachmentsSectionProps {
  patientId: string;
  canUpload: boolean;
  canDelete: boolean;
  activeAppointmentId?: string;
}

export function PatientAttachmentsSection({ patientId, canUpload, canDelete, activeAppointmentId }: PatientAttachmentsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { attachments, loading, uploading, upload, remove } = usePatientAttachments(patientId);

  const handleUpload = async (file: File, category: AttachmentCategory, notes?: string) => {
    try {
      await upload(file, category, notes, activeAppointmentId);
      void message.success("Archivo subido correctamente");
    } catch {
      void message.error("Error al subir el archivo");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      void message.success("Archivo eliminado");
    } catch {
      void message.error("Error al eliminar el archivo");
    }
  };

  // Group by category
  const grouped = ATTACHMENT_CATEGORIES.map((cat) => ({
    ...cat,
    items: attachments.filter((a) => a.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          <span>Archivos</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </div>
        {canUpload && (
          <Button
            type="text"
            size="small"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setModalOpen(true)}
            className="text-xs"
          >
            Agregar
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Spin size="small" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-4 text-center">
          <FileX2 className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Sin archivos adjuntos</p>
          {canUpload && (
            <Button size="small" type="dashed" onClick={() => setModalOpen(true)} className="text-xs">
              Subir primer archivo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.value} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
