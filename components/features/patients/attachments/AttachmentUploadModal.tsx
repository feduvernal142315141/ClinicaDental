"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, KeyboardEvent } from "react";
import { Upload as UploadIcon, X, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { notify } from "@/lib/utils/notify";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import TextArea from "@/components/ui/atomic/forms/textarea";

// ── Constantes de validación ───────────────────────────────────────────────
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPTED_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ── Sub-componente: zona de arrastre accesible ─────────────────────────────

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

  // Limpiar URL al quitar el archivo o al desmontar
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

  // ── Vista: archivo seleccionado ──────────────────────────────────────────
  if (file) {
    return (
      <div className="relative rounded-xl border border-hairline bg-elevated p-4">
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
              className="max-h-28 rounded-lg object-contain"
            />
            <span className="flex items-center gap-1 text-xs text-subtle">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[200px] truncate">{file.name}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <div className="rounded-lg bg-brand/10 p-2.5">
              <FileText className="h-6 w-6 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{file.name}</p>
              <p className="text-xs text-subtle">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista: zona vacía ─────────────────────────────────────────────────────
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
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          isDragging
            ? "border-brand bg-brand/5"
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
            // Limpiar para permitir seleccionar el mismo archivo de nuevo
            e.target.value = "";
          }}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
        />
        <div
          className={cn(
            "rounded-full p-3 transition-colors",
            isDragging ? "bg-brand/15" : "bg-elevated",
          )}
        >
          <UploadIcon
            className={cn("h-6 w-6 transition-colors", isDragging ? "text-brand" : "text-subtle")}
          />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-ink">
            Haz clic o arrastra un archivo aquí
          </p>
          <p className="text-xs text-subtle">
            JPG, PNG, WEBP, PDF — máx. {MAX_SIZE_MB} MB
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

// ── Modal principal ────────────────────────────────────────────────────────

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
    if (!ACCEPTED_MIME.includes(f.type)) {
      setFileError("Tipo no aceptado. Solo se permiten: JPG, PNG, WEBP y PDF.");
      return;
    }
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
            placeholder="Notas adicionales..."
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
