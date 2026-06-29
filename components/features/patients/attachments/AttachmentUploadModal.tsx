"use client";

import { useState } from "react";
import { Upload } from "antd";
import { Upload as UploadIcon } from "lucide-react";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { notify } from "@/lib/utils/notify";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import TextArea from "@/components/ui/atomic/forms/textarea";

interface AttachmentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, category: AttachmentCategory, notes?: string, appointmentId?: string) => Promise<void>;
  uploading: boolean;
  appointmentId?: string;
}

export function AttachmentUploadModal({ open, onClose, onUpload, uploading, appointmentId }: AttachmentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory | null>(null);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFile(null);
    setCategory(null);
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) {
      void notify.warning("Falta el archivo", {
        description: "Arrastra o elige una imagen o PDF antes de subirlo al expediente del paciente.",
      });
      return;
    }
    if (!category) {
      void notify.warning("Falta la categoría", {
        description: "Elige una categoría para clasificar el archivo dentro del expediente del paciente.",
      });
      return;
    }
    await onUpload(file, category, notes.trim() || undefined, appointmentId);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      icon={<UploadIcon className="h-5 w-5" />}
      title="Agregar archivo"
      description="Adjunta una imagen o PDF al expediente del paciente."
      className="w-full sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button type="button" loading={uploading} onClick={handleSubmit}>
            Subir
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-6 pb-6">
        <Upload.Dragger
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          maxCount={1}
          beforeUpload={(f) => {
            setFile(f);
            return false;
          }}
          onRemove={() => setFile(null)}
          fileList={file ? [{ uid: "1", name: file.name, status: "done" }] : []}
        >
          <p className="ant-upload-drag-icon flex justify-center">
            <UploadIcon className="h-8 w-8 text-brand" />
          </p>
          <p className="ant-upload-text">Haz clic o arrastra un archivo aquí</p>
          <p className="ant-upload-hint">JPG, PNG, WEBP, PDF — máx. 1 archivo</p>
        </Upload.Dragger>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Categoría <span className="text-rose-500">*</span>
          </label>
          <Select
            value={category ?? ""}
            onChange={(v) => setCategory(v as AttachmentCategory)}
            options={ATTACHMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="Selecciona una categoría"
            disabled={uploading}
            aria-label="Categoría"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Notas (opcional)</label>
          <TextArea
            rows={2}
            placeholder="Notas adicionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading}
            aria-label="Notas"
          />
        </div>
      </div>
    </Modal>
  );
}
