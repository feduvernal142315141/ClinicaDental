"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/primitives/shadcn/dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { cn } from "@/lib/utils/utils";

export interface LightboxImage {
  id: string;
  url: string;
  name: string;
}

interface FeedbackAttachmentLightboxProps {
  images: LightboxImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/**
 * Visor fullscreen de capturas del ticket de feedback.
 * Navegación con flechas / teclado, descarga y cierre con Esc.
 */
export function FeedbackAttachmentLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: FeedbackAttachmentLightboxProps) {
  const current = images[index] ?? null;
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  const handleDownload = useCallback(() => {
    if (!current) return;
    const anchor = document.createElement("a");
    anchor.href = current.url;
    anchor.download = current.name || `captura-${index + 1}.png`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  }, [current, index]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 top-0 left-0 z-[60] flex h-dvh max-h-dvh w-screen max-w-none",
          "translate-x-0 translate-y-0 rounded-none border-0 bg-black/95 p-0 shadow-none",
          "gap-0 sm:max-w-none",
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {current
            ? `Captura ${index + 1} de ${images.length}: ${current.name}`
            : "Visor de capturas"}
        </DialogTitle>

        {/* Barra superior */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <p className="truncate text-sm font-medium text-white/90">
            {current?.name ?? "Captura"}
            {images.length > 1 ? (
              <span className="ml-2 text-white/50">
                {index + 1} / {images.length}
              </span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleDownload}
              aria-label="Descargar captura"
              disabled={!current}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Imagen */}
        <div className="flex h-full w-full items-center justify-center px-12 py-16 sm:px-20">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt={current.name}
              className="max-h-full max-w-full object-contain select-none"
              draggable={false}
            />
          ) : null}
        </div>

        {/* Navegación */}
        {hasPrev ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:left-4"
            onClick={goPrev}
            aria-label="Captura anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        ) : null}
        {hasNext ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:right-4"
            onClick={goNext}
            aria-label="Captura siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
