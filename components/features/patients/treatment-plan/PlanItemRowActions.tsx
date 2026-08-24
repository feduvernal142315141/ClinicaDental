"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/primitives/shadcn/button";
import type { PlanItemRow } from "@/lib/hooks/odontogram";
import { notify } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/utils";
import {
  describePlanItem,
  describePlanItemScope,
} from "./plan-item-display";

/** Qué diálogo abre el menú. `null` = ninguno. */
type RowDialog = "remove";

export interface PlanItemRowActionsProps {
  row: PlanItemRow;
  /** `true` mientras esta línea tiene una mutación en vuelo. */
  pending: boolean;
  onRemove: (itemId: string) => Promise<boolean>;
}

/**
 * PlanItemRowActions
 *
 * Menú de una línea del plan: decisión del paciente, fase, descuento, sesión y
 * quitarla del presupuesto.
 *
 * Los diálogos se abren desde `onCloseAutoFocus` del menú y no desde el propio
 * `onSelect`. El contenido del menú tiene animación de salida, así que Radix lo
 * mantiene montado unos 150 ms después de cerrarlo: abrir el diálogo en el clic
 * lo monta ANTES de que el menú se desmonte y, al desmontarse, el menú devuelve
 * el foco a su disparador — sacándolo del diálogo recién abierto. Encadenándolo
 * al cierre, el foco va disparador → diálogo → disparador, que es lo que un
 * usuario de teclado espera.
 *
 * Ninguna acción calcula importes ni estados: se manda el cambio y se relee lo
 * que devuelva el servidor (`useTreatmentPlanItems` recarga tras cada mutación).
 */
export function PlanItemRowActions({
  row,
  pending,
  onRemove,
}: PlanItemRowActionsProps) {
  const { item } = row;
  const [dialog, setDialog] = useState<RowDialog | null>(null);
  /**
   * Diálogo elegido en el menú, todavía sin abrir. Es un ref y no estado porque
   * lo escribe `onSelect` y lo lee `onCloseAutoFocus` en el mismo gesto, antes
   * de que React vuelva a renderizar.
   */
  const pendingDialogRef = useRef<RowDialog | null>(null);

  const label = describePlanItem(item, row.teeth);

  /**
   * ¿Hay ya un cambio en vuelo sobre ESTA línea? El hook descarta el segundo
   * disparo en silencio (`registerSession` suma +1 en cada llamada y no se puede
   * deshacer), y un clic que no hace nada ni dice nada se lee como que la
   * pantalla está rota. Aquí se dice.
   */
  const blockedByPending = (): boolean => {
    if (!pending) return false;
    notify.info("Hay un cambio en curso", {
      description:
        "Espera a que termine el cambio anterior de esta línea e inténtalo otra vez.",
    });
    return true;
  };

  const handleRemove = () => {
    if (blockedByPending()) return;
    void (async () => {
      const removed = await onRemove(item.id);
      if (!removed) return;
      notify.success("Línea quitada del presupuesto", {
        description: `«${item.serviceName}» ya no cuenta en el total. El hallazgo del odontograma sigue donde estaba.`,
      });
    })();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* `aria-busy` y NO `disabled`: el foco vuelve a este botón justo
              cuando el menú se cierra, o sea en el mismo instante en que empieza
              la mutación — deshabilitarlo ahí tira el foco al `<body>` y deja al
              usuario de teclado tabulando desde el principio del documento
              después de cada acción. Queda enfocable, anuncia que está ocupado y
              `blockedByPending` explica el segundo intento. */}
          <button
            type="button"
            aria-busy={pending || undefined}
            // Ocho botones "Más acciones" seguidos no dicen sobre qué actúa cada
            // uno: el nombre accesible lleva el servicio y la pieza.
            aria-label={`Acciones de ${label}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-[busy=true]:cursor-progress aria-[busy=true]:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                <span className="sr-only">Guardando…</span>
              </>
            ) : (
              <MoreVertical aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-64"
          onCloseAutoFocus={() => {
            const next = pendingDialogRef.current;
            if (!next) return;
            pendingDialogRef.current = null;
            // Sin `preventDefault`: el foco vuelve al disparador y desde ahí lo
            // toma el diálogo, que al cerrarse lo devolverá al mismo sitio.
            setDialog(next);
          }}
        >
          {/* Solo ACCIONES (skill `ui-interacciones`): las propiedades
              (estado, prioridad) se editan sobre su propio valor en la fila,
              no escondidas aquí. Queda lo único que es una acción de verdad. */}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              pendingDialogRef.current = "remove";
            }}
          >
            <Trash2 aria-hidden="true" />
            Quitar del presupuesto…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={dialog === "remove"}
        onOpenChange={(open) => setDialog(open ? "remove" : null)}
      >
        <AlertDialogContent className="border-hairline bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink">
              ¿Quitar esta línea del presupuesto?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-subtle">
              «{item.serviceName}» ({describePlanItemScope(item, row.teeth)})
              dejará de aparecer en el plan y su importe saldrá del total.
              <br />
              <strong className="font-semibold text-ink">
                No se borra nada del odontograma ni de la historia clínica:
              </strong>{" "}
              el hallazgo y su tratamiento siguen registrados en la pieza. Esto
              solo lo saca del presupuesto. Para volver a cobrarlo tendrás que
              añadirlo otra vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Quitar del presupuesto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
