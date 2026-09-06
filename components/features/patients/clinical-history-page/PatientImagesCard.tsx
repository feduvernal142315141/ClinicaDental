"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  ImagePlus,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { toLocalDate } from "@/lib/datetime";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import type {
  AttachmentCategory,
  PatientAttachment,
} from "@/lib/entity/patientAttachment";

// ── Validación de cliente ───────────────────────────────────────────────────
// Replica EXACTAMENTE la de `AttachmentUploadModal`. El backend NO valida el
// tipo ni el tamaño del archivo: esta es la única barrera que existe, así que
// no se relaja aquí "porque la tarjeta es más pequeña".
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ACCEPTED_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * Categoría con la que se guarda lo que se sube DESDE esta tarjeta.
 *
 * La tarjeta no pregunta la categoría (el mockup es una caja de arrastre, no un
 * formulario), y "radiografía" es una AFIRMACIÓN sobre el contenido clínico que
 * el front no puede hacer por el usuario. `imagen_clinica` es la etiqueta
 * neutra: describe el continente, no el diagnóstico. Para clasificar como
 * radiografía o consentimiento está el modal completo de "Ver todas".
 */
const UPLOAD_CATEGORY: AttachmentCategory = "imagen_clinica";

/** ISO → `DD/MM/AA` en hora LOCAL (nunca `toISOString`, que devuelve UTC). */
function shortDate(iso?: string): string {
  const local = toLocalDate(iso);
  if (!local) return "";
  const [year, month, day] = local.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

/**
 * Miniatura = FICHA, no <img>.
 *
 * No hay URL pública ni endpoint de miniatura: la descarga es
 * `GET /patients/{id}/attachments/{id}/download` con Authorization, y devuelve
 * el Blob COMPLETO (hasta 10 MB). Un `<img src>` apuntando al backend ni
 * siquiera llevaría la cabecera de sesión, y resolverlo con blobs supondría
 * descargar el archivo entero por cada celda solo para pintar 90 píxeles.
 * Por eso cada celda es un icono por tipo + nombre + fecha.
 */
function AttachmentTile({ attachment }: { attachment: PatientAttachment }) {
  const isPdf = attachment.mimeType === "application/pdf";
  const isImage = attachment.mimeType?.startsWith("image/");

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-hover"
      title={`${attachment.fileName} — ${shortDate(attachment.uploadedAt)}`}
    >
      <div className="flex h-full w-full items-center justify-center">
        {isImage ? (
          <ImageIcon className="h-7 w-7 text-brand" aria-hidden="true" />
        ) : isPdf ? (
          <FileText className="h-7 w-7 text-subtle" aria-hidden="true" />
        ) : (
          <FileIcon className="h-7 w-7 text-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1.5 py-1">
        <p className="truncate text-[10px] font-medium leading-tight text-white">
          {attachment.fileName}
        </p>
        <p className="text-[10px] leading-tight text-white/70">
          {shortDate(attachment.uploadedAt)}
        </p>
      </div>
    </div>
  );
}

export interface PatientImagesCardProps {
  patientId: string;
  /** Permiso de subida. En `false` el slot y la zona de arrastre se OCULTAN. */
  canManage?: boolean;
  /** Lleva a la pestaña de Imágenes y archivos. */
  onViewAll?: () => void;
  /** Cita en curso: asocia el archivo subido a esa visita si existe. */
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

  const images = attachments.filter((a) => a.mimeType?.startsWith("image/"));
  // La tercera celda de la fila es el slot "+ Subir" cuando hay permiso; sin
  // permiso ese hueco lo ocupa una imagen más.
  const visible = images.slice(0, canManage ? 2 : 3);

  const openPicker = useCallback(() => {
    if (!uploading) inputRef.current?.click();
  }, [uploading]);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setFileError(null);

      if (!ACCEPTED_MIME.includes(file.type)) {
        setFileError(
          "Tipo no aceptado. Solo se permiten: JPG, PNG, WEBP y PDF.",
        );
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFileError(
          `El archivo supera los ${MAX_SIZE_MB} MB. Elige uno más pequeño e inténtalo de nuevo.`,
        );
        return;
      }

      try {
        await upload(file, UPLOAD_CATEGORY, undefined, activeAppointmentId);
        void notify.success("Archivo subido", {
          description:
            file.type === "application/pdf"
              ? "El PDF se guardó en el expediente como Imagen clínica; se ve en «Ver todas», no en esta fila de imágenes."
              : "La imagen se guardó en el expediente como Imagen clínica.",
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
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <section className="bento p-4">
      {/* Cabecera */}
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

      {/* Un fallo de lectura NO es "no hay imágenes": son dos frases distintas
          y solo una de ellas afirma algo sobre el expediente del paciente. */}
      {error ? (
        <Alert live={false}>
          <AlertTriangle />
          <AlertTitle>No se pudieron cargar las imágenes</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              No hemos podido leer los archivos de este paciente. Puede haber
              imágenes que no se están mostrando.
            </span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visible.map((attachment) => (
              <AttachmentTile key={attachment.id} attachment={attachment} />
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
                aria-label="Subir una imagen o PDF al expediente"
              >
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium">Subir</span>
              </button>
            )}
          </div>

          {/* Estado vacío honesto: describe el registro, no al paciente. */}
          {!loading && images.length === 0 && (
            <p className="mt-2 text-xs text-subtle">
              Sin imágenes registradas en el expediente.
            </p>
          )}
          {loading && images.length === 0 && (
            <p className="mt-2 text-xs text-subtle">Cargando archivos…</p>
          )}

          {/* Zona de arrastre — se OCULTA sin permiso (patrón de esta vista),
              no se deshabilita. */}
          {canManage && (
            <>
              <div
                role="button"
                tabIndex={uploading ? -1 : 0}
                aria-label="Zona de carga: haz clic o arrastra un archivo aquí para subirlo al expediente"
                aria-disabled={uploading}
                onClick={openPicker}
                onKeyDown={onKeyDown}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={cn(
                  "mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-bento border border-dashed p-4 text-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isDragging
                    ? "border-brand bg-brand/5"
                    : fileError
                      ? "border-rose-400 bg-rose-500/5 dark:border-rose-500/60"
                      : "border-hairline hover:border-brand/50 hover:bg-hover",
                  uploading && "pointer-events-none opacity-60",
                )}
              >
                <UploadCloud
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isDragging ? "text-brand" : "text-subtle",
                  )}
                  aria-hidden="true"
                />
                <p className="text-xs font-medium text-ink">
                  {uploading ? "Subiendo archivo…" : "Arrastra archivos aquí"}
                </p>
                <p className="text-[11px] text-subtle">
                  o haz clic para examinar
                </p>
                <p className="text-[10px] text-subtle">
                  JPG, PNG, WEBP o PDF — máx. {MAX_SIZE_MB} MB
                </p>
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
                    // Permite volver a elegir el MISMO archivo tras un error.
                    e.target.value = "";
                  }}
                />
              </div>

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
    </section>
  );
}
