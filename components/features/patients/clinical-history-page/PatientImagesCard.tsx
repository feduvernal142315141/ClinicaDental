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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { toLocalDate } from "@/lib/datetime";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import { ATTACHMENT_CATEGORIES } from "@/lib/entity/patientAttachment";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
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
/**
 * Nombre legible del adjunto.
 *
 * El backend guarda el fichero como `UUID_nombreOriginal` y el DTO del LISTADO
 * devuelve esa cadena tal cual — el nombre original solo viaja en la cabecera de
 * la descarga. Así que la miniatura mostraba "16bbcdb9-8812-4a22-9aab-0…", que
 * no dice nada de lo que hay dentro.
 *
 * Se le quita el prefijo cuando lo lleva. Si detrás no queda nada legible, se
 * cae a la categoría clínica del adjunto ("Radiografía", "Imagen clínica"…),
 * que es un dato REAL del registro y no una etiqueta inventada.
 */
const UUID_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i;

function displayFileName(attachment: PatientAttachment): string {
  const raw = (attachment.fileName ?? "").trim();
  const stripped = raw.replace(UUID_PREFIX, "").trim();
  if (stripped) return stripped;
  const category = ATTACHMENT_CATEGORIES.find(
    (c) => c.value === attachment.category,
  )?.label;
  return category ?? "Archivo";
}

function AttachmentTile({
  attachment,
  onDownload,
  downloading,
}: {
  attachment: PatientAttachment;
  onDownload: (attachment: PatientAttachment) => void;
  downloading: boolean;
}) {
  const isPdf = attachment.mimeType === "application/pdf";
  const isImage = attachment.mimeType?.startsWith("image/");

  // Botón, no div con onClick: se necesita foco por teclado, Enter/Espacio y un
  // nombre accesible. Descarga en vez de previsualizar — no existe URL pública
  // ni endpoint de miniatura, así que "previsualizar" significaría bajarse el
  // fichero entero (hasta 10 MB) igualmente.
  //
  // Sin `hover:scale`: no hay un solo uso de transform en esta vista, y la celda
  // vive dentro del ancestro con scroll de ADR-36, donde crecer empuja píxeles
  // fuera de la caja. El realce va por color y anillo, como el resto.
  return (
    <button
      type="button"
      onClick={() => onDownload(attachment)}
      disabled={downloading}
      aria-label={`Descargar ${displayFileName(attachment)}`}
      className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-hover text-left transition-colors hover:border-brand/40 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
      title={`${displayFileName(attachment)} — ${shortDate(attachment.uploadedAt)}`}
    >
      <div className="flex h-full w-full items-center justify-center">
        {downloading ? (
          <Loader2
            className="h-6 w-6 animate-spin text-subtle motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : isImage ? (
          <ImageIcon className="h-7 w-7 text-brand" aria-hidden="true" />
        ) : isPdf ? (
          <FileText className="h-7 w-7 text-subtle" aria-hidden="true" />
        ) : (
          <FileIcon className="h-7 w-7 text-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1.5 py-1">
        <p className="truncate text-[10px] font-medium leading-tight text-white">
          {displayFileName(attachment)}
        </p>
        <p className="text-[10px] leading-tight text-white/70">
          {shortDate(attachment.uploadedAt)}
        </p>
      </div>
    </button>
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (attachment: PatientAttachment) => {
      setDownloadingId(attachment.id);
      try {
        const blob = await patientAttachmentsService.downloadAttachment(
          patientId,
          attachment.id,
        );
        // Ancla sintética con `revokeObjectURL` inmediato: el navegador ya ha
        // tomado el blob al disparar el clic, así que no se filtra memoria.
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = attachment.fileName;
        anchor.click();
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        notifyApiError("No se pudo descargar el archivo", error);
      } finally {
        setDownloadingId(null);
      }
    },
    [patientId],
  );

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
                onDownload={handleDownload}
                downloading={downloadingId === attachment.id}
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

          {/* El input vive suelto: la caja de arrastre se retiró (consumía ~120px
              en una columna que ya era demasiado alta) y ahora quien dispara el
              selector es el slot "+ Subir" de la rejilla. Arrastrar sigue
              funcionando: el drop se escucha sobre la propia rejilla, así que no
              se perdió la función, solo el ladrillo. */}
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
                  // Permite volver a elegir el MISMO archivo tras un error.
                  e.target.value = "";
                }}
              />
              <p className="mt-2 text-[10px] text-subtle">
                JPG, PNG, WEBP o PDF — máx. {MAX_SIZE_MB} MB
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
    </section>
  );
}
