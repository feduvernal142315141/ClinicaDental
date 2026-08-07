"use client";

import { useRef, useState } from "react";
import {
  BadgePercent,
  CalendarCheck,
  Layers3,
  Loader2,
  MoreHorizontal,
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/primitives/shadcn/button";
import type { PlanItemRow } from "@/lib/hooks/odontogram";
import type {
  PlanItemDecision,
  UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";
import { notify } from "@/lib/utils/notify";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { cn } from "@/lib/utils/utils";
import {
  PLAN_ITEM_DECISION_ACTIONS,
  describePlanItem,
  describePlanItemScope,
  getSessionBlockReason,
} from "./plan-item-display";
import { PlanItemDiscountDialog } from "./PlanItemDiscountDialog";
import { PlanItemPhaseDialog } from "./PlanItemPhaseDialog";

/** Qué diálogo abre el menú. `null` = ninguno. */
type RowDialog = "phase" | "discount" | "remove";

export interface PlanItemRowActionsProps {
  row: PlanItemRow;
  /** Moneda congelada del plan. */
  currency: string;
  /** Fases que ya existen en el plan (para no inventar una numeración nueva). */
  usedPhases: number[];
  /** `true` mientras esta línea tiene una mutación en vuelo. */
  pending: boolean;
  /**
   * `false` OCULTA "Registrar sesión". El backend protege ese endpoint con
   * `hasAuthority('odontogram')`, y una acción que siempre responde 403 es peor
   * que una que no está: promete algo que el rol no puede hacer.
   */
  canRegisterSession: boolean;
  onUpdate: (itemId: string, changes: UpdatePlanItemRequest) => Promise<boolean>;
  onRegisterSession: (itemId: string) => Promise<boolean>;
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
  currency,
  usedPhases,
  pending,
  canRegisterSession,
  onUpdate,
  onRegisterSession,
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
  const decision: PlanItemDecision = item.decision ?? "proposed";
  const discount = item.discountAmount ?? 0;
  const sessionBlockReason = getSessionBlockReason(item);
  const nextSession = (item.sessionsDone ?? 0) + 1;

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

  /** Lanza el PATCH y avisa SOLO del éxito: del fallo ya avisó el hook. */
  const runUpdate = async (
    changes: UpdatePlanItemRequest,
    successTitle: string,
    successDescription: string,
  ): Promise<boolean> => {
    if (blockedByPending()) return false;
    const saved = await onUpdate(item.id, changes);
    if (saved) notify.success(successTitle, { description: successDescription });
    return saved;
  };

  const handleDecision = (next: string) => {
    if (next === decision) return; // Volver a marcar lo ya marcado no es un cambio.
    const action = PLAN_ITEM_DECISION_ACTIONS.find((a) => a.decision === next);
    if (!action) return;

    void runUpdate(
      { decision: action.decision },
      `Línea marcada como «${action.label.toLowerCase()}»`,
      next === "rejected"
        ? `«${item.serviceName}» sale del total del plan. Sigue en la lista, tachada, para dejar constancia de que se ofreció.`
        : `Se actualizó el total del plan con «${item.serviceName}».`,
    );
  };

  const handleRegisterSession = () => {
    if (blockedByPending()) return;
    void (async () => {
      const saved = await onRegisterSession(item.id);
      if (!saved) return;
      notify.success("Sesión registrada", {
        description:
          nextSession >= (item.sessionsPlanned ?? 1)
            ? `«${item.serviceName}» completó sus ${item.sessionsPlanned} ${
                (item.sessionsPlanned ?? 1) === 1 ? "sesión" : "sesiones"
              } y pasa a «Hecho».`
            : `Van ${nextSession} de ${item.sessionsPlanned} sesiones de «${item.serviceName}».`,
      });
    })();
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
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
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
          <DropdownMenuLabel className="text-xs font-normal text-subtle">
            Decisión del paciente
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={decision} onValueChange={handleDecision}>
            {PLAN_ITEM_DECISION_ACTIONS.map((action) => (
              <DropdownMenuRadioItem
                key={action.decision}
                value={action.decision}
              >
                {action.verb}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              pendingDialogRef.current = "phase";
            }}
          >
            <Layers3 aria-hidden="true" />
            Cambiar de fase…
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              pendingDialogRef.current = "discount";
            }}
          >
            <BadgePercent aria-hidden="true" />
            {discount > 0 ? "Cambiar el descuento…" : "Aplicar descuento…"}
          </DropdownMenuItem>

          {canRegisterSession && (
            <>
              <DropdownMenuSeparator />
              {/* `aria-disabled` y NO `disabled`: Radix saca del recorrido por
                  teclado los ítems deshabilitados de verdad, así que el motivo
                  —que es justo lo que hay que leer— no llegaría nunca a un
                  usuario de teclado. Aquí queda enfocable, anunciado como no
                  disponible, y al activarlo repite el porqué sin cerrar el
                  menú. Mismo criterio que el botón de «Añadir al plan». */}
              <DropdownMenuItem
                aria-disabled={Boolean(sessionBlockReason)}
                onSelect={(event) => {
                  if (!sessionBlockReason) {
                    handleRegisterSession();
                    return;
                  }
                  event.preventDefault(); // Deja el menú abierto para corregirlo.
                  notify.info("No se puede registrar la sesión", {
                    description: sessionBlockReason,
                  });
                }}
                // Radix ENFOCA el ítem con el simple movimiento del ratón
                // (`item.focus()` en su `onPointerMove`), así que `:focus` se
                // activa al pasar por encima y no solo con el teclado. El
                // primitivo lo pinta entonces con `focus:bg-accent` —el violeta
                // de la paleta (dropdown-menu.tsx:77)—, y los hijos de este
                // ítem llevan color propio, así que NO conmutan a
                // `accent-foreground` como en los demás ítems: el motivo se
                // quedaría en ~1,4:1 sobre el violeta, justo el texto que hay
                // que leer. Se neutraliza el resaltado a `bg-hover`, la misma
                // receta de `sidebar-footer.tsx:26`, donde el rose del motivo
                // se lee a 5,7:1 (claro) / 6,8:1 (oscuro).
                //
                // `focus:text-ink` es obligatorio, no decorativo: cuando NO hay
                // motivo de bloqueo el rótulo no lleva color y heredaría
                // `accent-foreground` —blanco en claro— sobre un fondo casi
                // blanco. `group` habilita el `group-focus:` de los hijos.
                //
                // Y como `bg-hover` es un VELO translúcido (4,5% en claro, 5%
                // en oscuro), por sí solo no es un indicador de foco: da 1,1:1
                // contra el popover, y el primitivo apaga el anillo nativo con
                // `outline-hidden` (dropdown-menu.tsx:77). Sin el anillo
                // explícito, el único ítem que dispara la acción irreversible
                // del menú sería también el único sin foco visible (WCAG 2.2
                // 2.4.7, y 1.4.11 para el propio indicador). El anillo va
                // `inset` para no desbordar el popover.
                className="group flex-col items-start gap-0.5 focus:bg-hover focus:text-ink focus:ring-2 focus:ring-inset focus:ring-brand"
              >
                {/* NADA de `opacity-60` sobre el ítem entero: el motivo va en
                    `text-subtle` de 12px y al 60% se queda en 2,5:1 (claro) y
                    2,7:1 (oscuro), o sea justo el texto que hay que leer es el
                    menos legible del menú. El ítem tampoco está `disabled` de
                    verdad —sigue enfocable y activable—, así que la exención de
                    1.4.3 para componentes inactivos no aplica. El énfasis se
                    baja donde no cuesta legibilidad: el rótulo y el icono.
                    Ese `text-subtle` sube a `text-ink` mientras el ítem está
                    enfocado/bajo el ratón: sobre `bg-hover` se quedaría en
                    4,26:1 en oscuro, por debajo del 4,5:1 de AA. */}
                <span
                  className={cn(
                    "flex items-center gap-2",
                    sessionBlockReason && "text-subtle group-focus:text-ink",
                  )}
                >
                  <CalendarCheck
                    aria-hidden="true"
                    className={cn("size-4", sessionBlockReason && "opacity-60")}
                  />
                  Registrar sesión
                </span>
                <span
                  className={cn(
                    "pl-6 text-xs",
                    // Mismo tinte que `Alert variant="destructive"`:
                    // `--destructive` está declarado IGUAL en `:root` y en
                    // `.dark` (globals.css:25 y :91) y no llega a AA sobre el
                    // popover navy, así que el rose dual-tema es la receta que
                    // ya usa el resto del sistema.
                    sessionBlockReason
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-subtle group-focus:text-ink",
                  )}
                >
                  {sessionBlockReason ??
                    `Pasará a ${nextSession} de ${item.sessionsPlanned}.`}
                </span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              pendingDialogRef.current = "remove";
            }}
            // El primitivo pinta `variant="destructive"` con `--destructive`
            // (dropdown-menu.tsx:77), el ÚNICO color de la paleta declarado
            // igual en `:root` y en `.dark` (globals.css:25 y :91): sobre el
            // `--popover` navy del tema oscuro se queda en 2,8:1 — por debajo
            // del 4,5:1 de AA e incluso del 3:1 de componentes. En claro pasa
            // (5,4:1), así que el fallo no se ve revisando en claro.
            //
            // Se aplica aquí la misma receta dual-tema que `Alert
            // variant="destructive"` (atomic/feedback/alert.tsx:85). Los
            // modificadores se repiten TAL CUAL los del primitivo para que
            // tailwind-merge sustituya la clase en vez de dejar las dos: sin
            // el prefijo `data-[variant=destructive]:` la del primitivo gana
            // por especificidad (0,2,0 vs 0,1,0).
            className="data-[variant=destructive]:text-rose-700 dark:data-[variant=destructive]:text-rose-300 data-[variant=destructive]:focus:text-rose-700 dark:data-[variant=destructive]:focus:text-rose-300 data-[variant=destructive]:*:[svg]:!text-current"
          >
            <Trash2 aria-hidden="true" />
            Quitar del presupuesto…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PlanItemPhaseDialog
        open={dialog === "phase"}
        onOpenChange={(open) => setDialog(open ? "phase" : null)}
        item={item}
        usedPhases={usedPhases}
        onSubmit={(changes) =>
          runUpdate(
            changes,
            "Fase actualizada",
            `«${item.serviceName}» pasa a la fase ${changes.phase}.`,
          )
        }
      />

      <PlanItemDiscountDialog
        open={dialog === "discount"}
        onOpenChange={(open) => setDialog(open ? "discount" : null)}
        item={item}
        currency={currency}
        onSubmit={(changes) =>
          runUpdate(
            changes,
            (changes.discountAmount ?? 0) > 0
              ? "Descuento aplicado"
              : "Descuento retirado",
            (changes.discountAmount ?? 0) > 0
              ? `Se descontaron ${formatClinicCurrencyExact(
                  changes.discountAmount ?? 0,
                  currency,
                )} de «${item.serviceName}». El importe final lo recalculó el servidor.`
              : `«${item.serviceName}» vuelve a su precio de catálogo.`,
          )
        }
      />

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
