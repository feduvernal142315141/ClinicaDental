"use client"

import { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/shadcn/dialog"
import { cn } from "@/lib/utils/utils"

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  /** Icono opcional mostrado en un chip de marca a la izquierda del título. */
  icon?: ReactNode
  /** Pie opcional (acciones). Para forms, deja los botones dentro del <form> en children. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Modal Bento: superficie `bg-surface`, `rounded-2xl`, `shadow-bento`, cabecera
 * con chip de icono y tipografía `text-ink`/`text-subtle`. El padding del cuerpo
 * lo controla `children` (permite cuerpos con scroll y footers dentro de un form).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  footer,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-2xl border-hairline bg-surface p-0 shadow-bento",
          className,
        )}
      >
        {(title || description) && (
          <DialogHeader className="flex-row items-start gap-3 space-y-0 p-6 pb-4 text-left">
            {icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                {icon}
              </span>
            )}
            <div className="space-y-1">
              {title && <DialogTitle className="text-ink">{title}</DialogTitle>}
              {description && (
                <DialogDescription className="text-subtle">
                  {description}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>
        )}

        {children}

        {footer && (
          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
