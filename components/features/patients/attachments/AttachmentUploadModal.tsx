"use client";

import { useState } from "react";
import { Modal, Upload, Select, Input, Button, message } from "antd";
import { Upload as UploadIcon } from "lucide-react";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";

interface AttachmentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, category: AttachmentCategory, notes?: string) => Promise<void>;
  uploading: boolean;
}

export function AttachmentUploadModal({ open, onClose, onUpload, uploading }: AttachmentUploadModalProps) {
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
      void message.warning("Selecciona un archivo");
      return;
    }
    if (!category) {
      void message.warning("Selecciona una categoría");
      return;
    }
    await onUpload(file, category, notes.trim() || undefined);
    reset();
    onClose();
  };

  return (
    <Modal
      title="Agregar archivo"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={uploading}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" loading={uploading} onClick={handleSubmit}>
          Subir
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4 py-2">
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
            <UploadIcon className="h-8 w-8 text-primary" />
          </p>
          <p className="ant-upload-text">Haz clic o arrastra un archivo aquí</p>
          <p className="ant-upload-hint">JPG, PNG, WEBP, PDF — máx. 1 archivo</p>
        </Upload.Dragger>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Categoría <span className="text-red-500">*</span>
          </label>
          <Select
            className="w-full"
            placeholder="Selecciona una categoría"
            value={category}
            onChange={(v) => setCategory(v as AttachmentCategory)}
            options={ATTACHMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
          <Input.TextArea
            rows={2}
            placeholder="Notas adicionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
