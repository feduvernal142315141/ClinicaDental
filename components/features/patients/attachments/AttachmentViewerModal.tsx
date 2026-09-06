"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  FileText,
  FileSpreadsheet,
  Film,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import {
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_CATEGORY_COLORS,
  type PatientAttachment,
} from "@/lib/entity/patientAttachment";
import {
  displayFileName,
  formatFileDate,
  formatFileSize,
  getAttachmentMediaType,
  getFileExtension,
  MEDIA_TYPE_STYLES,
} from "@/lib/utils/attachment-helpers";
import { useAttachmentBlob } from "./use-attachment-thumbnail";

interface AttachmentViewerModalProps {
  open: boolean;
  onClose: () => void;
  attachments: PatientAttachment[];
  initialAttachmentId?: string | null;
  patientId: string;
}

export function AttachmentViewerModal({
  open,
  onClose,
  attachments,
  initialAttachmentId,
  patientId,
}: AttachmentViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (initialAttachmentId && attachments.length > 0) {
      const idx = attachments.findIndex((a) => a.id === initialAttachmentId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialAttachmentId, attachments]);

  const current = attachments[currentIndex] as PatientAttachment | undefined;

  const hasMultiple = attachments.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < attachments.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) setCurrentIndex((i) => i - 1);
  }, [hasPrev]);

  const handleNext = useCallback(() => {
    if (hasNext) setCurrentIndex((i) => i + 1);
  }, [hasNext]);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  const mediaType = current
    ? getAttachmentMediaType(current.fileName, current.mimeType)
    : "other";

  const { blobUrl, loading: blobLoading, error: blobError } = useAttachmentBlob(
    patientId,
    current?.id ?? "",
    open && Boolean(current?.id),
  );

  const [textContent, setTextContent] = useState<string | null>(null);
  const isTextOrCsv = useMemo(() => {
    if (!current) return false;
    const ext = getFileExtension(current.fileName);
    return ext === "csv" || ext === "txt";
  }, [current]);

  useEffect(() => {
    if (!blobUrl || !isTextOrCsv) {
      setTextContent(null);
      return;
    }
    let active = true;
    fetch(blobUrl)
      .then((res) => res.text())
      .then((text) => {
        if (active) setTextContent(text);
      })
      .catch(() => {
        if (active) setTextContent(null);
      });
    return () => {
      active = false;
    };
  }, [blobUrl, isTextOrCsv]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (mediaType === "image") {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoom((z) => Math.min(z + 0.25, 3.5));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoom((z) => Math.max(z - 0.25, 0.5));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(1);
          setRotation(0);
        } else if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          setRotation((r) => (r + 90) % 360);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handlePrev, handleNext, mediaType]);

  const handleDownload = async () => {
    if (!current) return;
    setDownloading(true);
    try {
      const blob = await patientAttachmentsService.downloadAttachment(
        patientId,
        current.id,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = current.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyApiError("No se pudo descargar el archivo", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!open || !current) return null;

  const categoryLabel =
    ATTACHMENT_CATEGORIES.find((c) => c.value === current.category)?.label ??
    current.category;
  const categoryClassName = ATTACHMENT_CATEGORY_COLORS[current.category];
  const mediaStyle = MEDIA_TYPE_STYLES[mediaType];
  const ext = getFileExtension(current.fileName).toUpperCase() || "ARCHIVO";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizador de archivo: ${displayFileName(current.fileName)}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-lg bg-white/10 p-2 text-white">
            {mediaType === "image" && <ImageIcon className="h-4 w-4 text-brand" />}
            {mediaType === "video" && <Film className="h-4 w-4 text-violet-400" />}
            {mediaType === "pdf" && <FileText className="h-4 w-4 text-rose-400" />}
            {mediaType === "spreadsheet" && <FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
            {mediaType === "document" && <FileText className="h-4 w-4 text-sky-400" />}
            {mediaType === "other" && <FileIcon className="h-4 w-4 text-white/70" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-white" title={current.fileName}>
                {displayFileName(current.fileName)}
              </h2>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", categoryClassName)}>
                {categoryLabel}
              </Badge>
              <span className="rounded bg-white/10 px-1 py-0.2 text-[10px] font-mono text-white/80">
                {ext}
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              {formatFileDate(current.uploadedAt)} · {formatFileSize(current.sizeBytes)}
              {current.notes && ` · ${current.notes}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMultiple && (
            <span className="hidden text-xs text-white/60 sm:inline-block pr-2">
              {currentIndex + 1} de {attachments.length}
            </span>
          )}

          {blobUrl && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-8 gap-1.5 px-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleOpenInNewTab}
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Nueva pestaña</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 gap-1.5 px-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
            onClick={handleDownload}
            disabled={downloading}
            title="Descargar archivo al ordenador"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">Descargar</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-8 w-8 rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            onClick={onClose}
            aria-label="Cerrar visualizador"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Archivo anterior"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white/80 backdrop-blur transition-all hover:bg-black/90 hover:text-white hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Archivo siguiente"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white/80 backdrop-blur transition-all hover:bg-black/90 hover:text-white hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <main className="flex h-full w-full items-center justify-center">
          {blobLoading ? (
            <div className="flex flex-col items-center gap-3 text-white/80">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-sm font-medium">Cargando archivo para visualización...</p>
            </div>
          ) : blobError ? (
            <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur">
              <AlertCircle className="h-10 w-10 text-rose-400" />
              <h3 className="text-base font-semibold">No se pudo cargar la vista previa</h3>
              <p className="text-xs text-white/70">
                {blobError}. Puedes intentar descargarlo directamente.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-white/20 text-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Descargar archivo
              </Button>
            </div>
          ) : !blobUrl ? null : mediaType === "image" ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <img
                src={blobUrl}
                alt={displayFileName(current.fileName)}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-h-[82vh] max-w-[90vw] select-none object-contain drop-shadow-2xl"
              />

              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  title="Reducir zoom (-)"
                  aria-label="Reducir zoom"
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[48px] text-center text-xs font-mono text-white/90">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3.5))}
                  title="Aumentar zoom (+)"
                  aria-label="Aumentar zoom"
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="mx-1 h-3 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotar 90° (R)"
                  aria-label="Rotar 90 grados"
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  title="Restablecer (0)"
                  aria-label="Restablecer tamaño y rotación"
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : mediaType === "video" ? (
            <div className="flex h-full w-full items-center justify-center p-2">
              <video
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] max-w-full rounded-xl bg-black shadow-2xl"
                src={blobUrl}
              >
                Tu navegador no soporta la reproducción de este video.
              </video>
            </div>
          ) : mediaType === "pdf" ? (
            <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl">
              <iframe
                src={`${blobUrl}#toolbar=1`}
                title={displayFileName(current.fileName)}
                className="h-full w-full border-none"
              />
            </div>
          ) : isTextOrCsv && textContent ? (
            <div className="flex h-full max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-surface text-ink shadow-2xl">
              <div className="flex items-center justify-between border-b border-hairline bg-elevated px-4 py-2 text-xs text-subtle">
                <span>Vista preliminar de texto / datos</span>
                <span>{textContent.split("\n").length} líneas</span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                <pre className="whitespace-pre-wrap">{textContent.slice(0, 10000)}</pre>
                {textContent.length > 10000 && (
                  <p className="mt-2 text-center text-xs text-subtle">
                    (Se muestran los primeros 10,000 caracteres. Descarga el archivo para verlo completo)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-white/15 bg-surface p-8 text-center text-ink shadow-2xl">
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner",
                  mediaStyle.cardBannerClass,
                )}
              >
                {mediaType === "spreadsheet" ? (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                ) : mediaType === "document" ? (
                  <FileText className="h-10 w-10 text-sky-600" />
                ) : (
                  <FileIcon className="h-10 w-10 text-subtle" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-ink break-all">
                  {displayFileName(current.fileName)}
                </h3>
                <p className="text-xs text-subtle">
                  Formato {ext} · {formatFileSize(current.sizeBytes)}
                </p>
              </div>

              <p className="text-xs text-subtle">
                Este formato ({ext}) no se puede previsualizar directamente en el navegador.
                Puedes descargarlo para abrirlo en tu aplicación de escritorio (Excel, Word u otra).
              </p>

              <div className="flex w-full flex-col gap-2 pt-2">
                <Button
                  variant="default"
                  className="w-full gap-2 bg-brand text-white hover:bg-brand/90"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Descargar archivo
                </Button>
                {blobUrl && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-hairline"
                    onClick={handleOpenInNewTab}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en nueva pestaña
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-white/10 bg-black/40 px-4 text-[11px] text-white/60">
        <div className="flex items-center gap-4">
          <span>Atajos: ← → Navegar · Esc Cerrar</span>
          {mediaType === "image" && <span>+ - Zoom · R Rotar · 0 Restablecer</span>}
        </div>
        <div>Clinic Flow 360 · Archivos del paciente</div>
      </footer>
    </div>
  );
}
