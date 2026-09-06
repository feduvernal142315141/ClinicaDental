"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Film,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { toLocalDate } from "@/lib/datetime";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import { ATTACHMENT_CATEGORIES } from "@/lib/entity/patientAttachment";
import type {
  AttachmentCategory,
  PatientAttachment,
} from "@/lib/entity/patientAttachment";
import {
  displayFileName,
  getAttachmentMediaType,
} from "@/lib/utils/attachment-helpers";
import { useAttachmentBlob } from "../attachments/use-attachment-thumbnail";
import { AttachmentViewerModal } from "../attachments/AttachmentViewerModal";

const ACCEPTED_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.mp4,.webm,.mov,.pdf,.xlsx,.xls,.csv,.doc,.docx,.txt";
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const UPLOAD_CATEGORY: AttachmentCategory = "imagen_clinica";

function shortDate(iso?: string): string {
  const local = toLocalDate(iso);
  if (!local) return "";
  const [year, month, day] = local.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function AttachmentTile({
  attachment,
  patientId,
  onView,
}: {
  attachment: PatientAttachment;
  patientId: string;
  onView: (attachment: PatientAttachment) => void;
}) {
  const mediaType = getAttachmentMediaType(attachment.fileName, attachment.mimeType);
  const isImage = mediaType === "image";
  const { blobUrl, loading: loadingBlob } = useAttachmentBlob(
    patientId,
    attachment.id,
    isImage,
  );

  return (
    <button
      type="button"
      onClick={() => onView(attachment)}
      aria-label={`Ver ${displayFileName(attachment.fileName)}`}
      className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-elevated text-left transition-all hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      title={`${displayFileName(attachment.fileName)} — ${shortDate(attachment.uploadedAt)}`}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        {isImage ? (
          loadingBlob ? (
            <Loader2
              className="h-5 w-5 animate-spin text-subtle motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : blobUrl ? (
            <img
              src={blobUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-brand" aria-hidden="true" />
          )
        ) : mediaType === "video" ? (
          <Film className="h-6 w-6 text-violet-500" aria-hidden="true" />
        ) : mediaType === "pdf" ? (
          <FileText className="h-6 w-6 text-rose-500" aria-hidden="true" />
        ) : (
          <FileIcon className="h-6 w-6 text-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-1.5 pb-1 pt-3">
        <p className="truncate text-[10px] font-medium leading-tight text-white">
          {displayFileName(attachment.fileName)}
        </p>
        <p className="text-[9px] leading-tight text-white/70">
          {shortDate(attachment.uploadedAt)}
        </p>
      </div>
    </button>
  );
}

export interface PatientImagesCardProps {
  patientId: string;
  canManage?: boolean;
  onViewAll?: () => void;
  activeAppointmentId?: string;
}

export function PatientImagesCard({
  patientId,
  canManage = false,
  onViewAll,
  activeAppointmentId,
}: PatientImagesCardProps) {
  const { attachments, loading, uploading, error, load, upload } =
    usePatientAttachments(patientId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  const images = attachments.filter((a) => {
    const type = getAttachmentMediaType(a.fileName, a.mimeType);
    return type === "image" || type === "video";
  });

  const visible = images.slice(0, canManage ? 2 : 3);

  const openPicker = useCallback(() => {
    if (!uploading) inputRef.current?.click();
  }, [uploading]);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setFileError(null);
      if (file.size > MAX_SIZE_BYTES) {
        setFileError(
          `El archivo supera los ${MAX_SIZE_MB} MB. Elige uno más pequeño e inténtalo de nuevo.`,
        );
        return;
      }
      try {
        await upload(file, UPLOAD_CATEGORY, undefined, activeAppointmentId);
        void notify.success("Archivo subido", {
          description: "El archivo se guardó correctamente en el expediente.",
        });
      } catch (err) {
        notifyApiError("No se pudo subir el archivo", err);
      }
    },
    [upload, activeAppointmentId],
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const handleTileView = (att: PatientAttachment) => {
    setSelectedAttachmentId(att.id);
    setViewerOpen(true);
  };

  return (
    <section className="bento p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-brand" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink">
            Imágenes y Radiografías
          </h3>
        </div>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium text-brand hover:text-brand"
            onClick={onViewAll}
          >
            Ver todas
          </Button>
        )}
      </div>

      {error ? (
        <Alert live={false}>
          <AlertTriangle />
          <AlertTitle>No se pudieron cargar las imágenes</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              No hemos podido leer los archivos de este paciente.
            </span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div
            onDragOver={canManage ? onDragOver : undefined}
            onDragLeave={canManage ? onDragLeave : undefined}
            onDrop={canManage ? onDrop : undefined}
            className={cn(
              "grid grid-cols-3 gap-2 rounded-xl transition-colors",
              isDragging && "bg-brand/5 ring-2 ring-brand/40",
            )}
          >
            {visible.map((attachment) => (
              <AttachmentTile
                key={attachment.id}
                attachment={attachment}
                patientId={patientId}
                onView={handleTileView}
              />
            ))}
            {canManage && (
              <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl",
                  "border border-dashed border-hairline bg-surface text-subtle transition-colors",
                  "hover:border-brand/50 hover:bg-hover hover:text-brand",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                aria-label="Subir una imagen o archivo al expediente"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                )}
                <span className="text-[10px] font-medium">Subir</span>
              </button>
            )}
          </div>
          {!loading && images.length === 0 && (
            <p className="mt-2 text-xs text-subtle">
              Sin imágenes registradas en el expediente.
            </p>
          )}
          {loading && images.length === 0 && (
            <p className="mt-2 text-xs text-subtle">Cargando archivos…</p>
          )}
          {canManage && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_ACCEPT}
                className="hidden"
                disabled={uploading}
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="mt-2 text-[10px] text-subtle">
                Imágenes y videos clínicos — máx. {MAX_SIZE_MB} MB
              </p>
              {fileError && (
                <p
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {fileError}
                </p>
              )}
            </>
          )}
        </>
      )}

      <AttachmentViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachments={images}
        initialAttachmentId={selectedAttachmentId}
        patientId={patientId}
      />
    </section>
  );
}
