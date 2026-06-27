"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/shadcn/dialog";
import { cn } from "@/lib/utils/utils";

export interface OdontogramModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  width?: string | number;
  /** Clase CSS del body del modal */
  bodyClassName?: string;
  footer?: ReactNode | null;
  /** Banner sticky superior (ej. cambios sin guardar, modo lectura) */
  topBanner?: ReactNode;
}

/**
 * Wrapper de modal del módulo odontograma.
 * Reconstruido sobre el primitivo shadcn `Dialog` con look Bento: superficie
 * `bg-surface`, `rounded-2xl`, `shadow-bento`, borde `border-hairline`, cabecera
 * con tipografía `text-ink`/`text-subtle`, banner sticky superior y cuerpo
 * scrollable. Modal ancho (por defecto 95vw, máximo 1100px). El clic en el mask
 * no cierra (equivale a `mask.closable=false`); la X y Escape sí.
 */
export function OdontogramModal({
  open,
  onClose,
  title,
  description,
  children,
  width = "95vw",
  bodyClassName,
  footer = null,
  topBanner,
}: OdontogramModalProps) {
  const hasHeader = Boolean(title || description);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="gap-0 overflow-hidden rounded-2xl border-hairline bg-surface p-0 shadow-bento"
        style={{ width, maxWidth: "min(1100px, calc(100% - 2rem))" }}
      >
        {hasHeader ? (
          <DialogHeader className="gap-0.5 px-6 pb-4 pt-6 text-left">
            {title ? (
              <DialogTitle asChild>
                <div className="text-lg font-bold leading-tight text-ink">
                  {title}
                </div>
              </DialogTitle>
            ) : (
              <DialogTitle className="sr-only">Diálogo</DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-xs font-normal leading-snug text-subtle">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Diálogo</DialogTitle>
        )}

        <div
          className={cn(
            "max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden px-6 pb-6",
            bodyClassName,
          )}
        >
          {topBanner && (
            <div className="sticky top-0 z-10 -mx-6 mb-3 px-6">{topBanner}</div>
          )}
          {children}
        </div>

        {footer && <div className="px-6 pb-4">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
