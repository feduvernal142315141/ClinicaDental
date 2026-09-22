"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, KeyboardEvent } from "react";
import {
  Upload as UploadIcon,
  X,
  FileText,
  AlertCircle,
  Film,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { notify } from "@/lib/utils/notify";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import TextArea from "@/components/ui/atomic/forms/textarea";
import {
  getAttachmentMediaType,
  getFileExtension,
  formatFileSize,
} from "@/lib/utils/attachment-helpers";

const ACCEPTED_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.mp4,.webm,.mov,.pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.rtf,.odt";
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface FileDropProps {
  file: File | null;
  onSelect: (f: File) => void;
  onRemove: () => void;
  error: string | null;
  disabled: boolean;
}

function FileDrop({ file, onSelect, onRemove, error, disabled }: FileDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const processFile = useCallback(
    (f: File) => {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
      onSelect(f);
    },
    [onSelect],
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
    onRemove();
  }, [onRemove]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  if (file) {
    const mediaType = getAttachmentMediaType(file.name, file.type);
    const ext = getFileExtension(file.name).toUpperCase() || "ARCHIVO";

    return (
      <div className="relative rounded-2xl border border-hairline bg-elevated p-4">
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="absolute right-2 top-2 rounded-full p-1 text-subtle transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          aria-label="Quitar archivo seleccionado"
        >
          <X className="h-4 w-4" />
        </button>

        {previewUrl ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa del archivo"
              className="max-h-28 rounded-lg object-contain shadow-sm"
            />
            <span className="flex items-center gap-1.5 text-xs text-subtle">
              <span className="rounded bg-brand/15 px-1 py-0.2 font-mono text-[10px] font-bold text-brand">
                {ext}
              </span>
              <span className="max-w-[200px] truncate font-medium text-ink">{file.name}</span>
              <span>· {formatFileSize(file.size)}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface shadow-sm border border-hairline">
              {mediaType === "video" && <Film className="h-6 w-6 text-violet-500" />}
              {mediaType === "pdf" && <FileText className="h-6 w-6 text-rose-500" />}
              {mediaType === "spreadsheet" && <FileSpreadsheet className="h-6 w-6 text-emerald-500" />}
              {mediaType === "document" && <FileText className="h-6 w-6 text-sky-500" />}
              {mediaType === "other" && <FileIcon className="h-6 w-6 text-subtle" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                <span className="rounded bg-elevated px-1.5 py-0.2 font-mono text-[10px] font-bold text-subtle border">
                  {ext}
                </span>
              </div>
              <p className="text-xs text-subtle">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Zona de carga: haz clic o arrastra un archivo aquí"
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          isDragging
            ? "border-brand bg-brand/5 scale-[0.99]"
            : error
              ? "border-destructive/40 bg-destructive/5"
              : "border-hairline bg-surface hover:border-brand/50 hover:bg-brand/5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
        />
        <div
          className={cn(
            "rounded-2xl p-3.5 transition-colors shadow-sm",
            isDragging ? "bg-brand/20 text-brand" : "bg-elevated text-subtle",
          )}
        >
          <UploadIcon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">
            Haz clic o arrastra un archivo aquí
          </p>
          <p className="text-xs text-subtle">
            Imágenes, videos, PDFs, Excel, Word — máx. {MAX_SIZE_MB} MB
          </p>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

interface AttachmentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, category: AttachmentCategory, notes?: string, appointmentId?: string) => Promise<void>;
  uploading: boolean;
  appointmentId?: string;
}

export function AttachmentUploadModal({
  open,
  onClose,
  onUpload,
  uploading,
  appointmentId,
}: AttachmentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [category, setCategory] = useState<AttachmentCategory | null>(null);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFile(null);
    setFileError(null);
    setCategory(null);
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (f: File) => {
    setFileError(null);
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(
        `El archivo supera los ${MAX_SIZE_MB} MB. Elige uno más pequeño e inténtalo de nuevo.`,
      );
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      void notify.warning("Falta el archivo", {
        description: "Arrastra o elige un archivo antes de subirlo al expediente del paciente.",
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
      description="Adjunta imágenes, videos, PDFs, documentos u hojas de cálculo al expediente del paciente."
      className="w-full sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button type="button" loading={uploading} onClick={handleSubmit}>
            Subir archivo
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-6 pb-6">
        <FileDrop
          file={file}
          onSelect={handleFileSelect}
          onRemove={() => {
            setFile(null);
            setFileError(null);
          }}
          error={fileError}
          disabled={uploading}
        />

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
            aria-label="Categoría del archivo"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Notas (opcional)</label>
          <TextArea
            rows={2}
            placeholder="Notas o descripción adicional del archivo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading}
            aria-label="Notas del archivo"
          />
        </div>
      </div>
    </Modal>
  );
}
