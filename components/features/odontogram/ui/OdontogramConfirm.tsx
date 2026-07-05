"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/odontogram/utils";

export interface OdontogramConfirmOptions {
  title: string;
  description: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel?: () => void;
}

type OdontogramConfirmFn = (options: OdontogramConfirmOptions) => void;

const OdontogramConfirmContext = createContext<OdontogramConfirmFn | null>(
  null,
);

/**
 * Hook que retorna la función `confirm` del módulo de odontograma.
 * Requiere que `OdontogramConfirmProvider` esté montado en el árbol del módulo.
 */
export function useOdontogramConfirm(): OdontogramConfirmFn {
  const confirm = useContext(OdontogramConfirmContext);

  if (!confirm) {
    throw new Error(
      "useOdontogramConfirm debe usarse dentro de <OdontogramConfirmProvider>. " +
        "Monta el provider en la raíz del módulo de odontograma.",
    );
  }

  return confirm;
}

export interface OdontogramConfirmProviderProps {
  children: ReactNode;
}

/**
 * Provider que renderiza un `AlertDialog` controlado (Radix/shadcn) y expone
 * `confirm(opts)` vía contexto, con la misma API que el antiguo
 * `modal.confirm` de AntD: título, descripción, textos, `danger`, `onOk`
 * y `onCancel` (disparado también por Escape y click en el overlay).
 */
export function OdontogramConfirmProvider({
  children,
}: OdontogramConfirmProviderProps) {
  const [pending, setPending] = useState<OdontogramConfirmOptions | null>(
    null,
  );
  // Espejo en ref para resolver una sola vez aunque Radix dispare
  // onOpenChange(false) después del click en Aceptar/Cancelar.
  const pendingRef = useRef<OdontogramConfirmOptions | null>(null);

  const confirm = useCallback<OdontogramConfirmFn>((options) => {
    pendingRef.current = options;
    setPending(options);
  }, []);

  const resolveCancel = useCallback(() => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.onCancel?.();
  }, []);

  const resolveOk = useCallback(() => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.onOk();
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resolveCancel();
    },
    [resolveCancel],
  );

  const danger = pending?.danger ?? false;

  return (
    <OdontogramConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={handleOpenChange}>
        {/*
          Radix AlertDialog no cierra al hacer click fuera y su Content
          embebe el overlay sin permitir estilarlo, así que añadimos un
          overlay propio transparente por encima (z-60) que captura el
          click en el fondo y lo trata como cancelación. El Content va
          también a z-60 para quedar sobre el Dialog del ToothModal (z-50).
        */}
        <AlertDialogPortal>
          <AlertDialogOverlay
            className="z-[60] bg-transparent"
            onClick={resolveCancel}
          />
        </AlertDialogPortal>
        <AlertDialogContent className="z-[60] max-w-md rounded-2xl border-hairline bg-surface shadow-bento">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-ink">
              <AlertTriangle
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 shrink-0",
                  danger ? "text-rose-500" : "text-amber-500",
                )}
              />
              {pending?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-subtle">
              {pending?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resolveCancel}>
              {pending?.cancelText ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={resolveOk}
              className={cn(
                danger && "bg-rose-600 text-white hover:bg-rose-700",
              )}
            >
              {pending?.okText ?? "Aceptar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OdontogramConfirmContext.Provider>
  );
}
