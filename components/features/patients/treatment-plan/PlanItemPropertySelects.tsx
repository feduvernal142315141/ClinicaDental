"use client";

import { ChevronDown, SignalHigh } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  StatusBadge,
} from "@/components/ui";
import {
  PLAN_ITEM_PRIORITIES,
  PLAN_ITEM_STATUSES,
  type PlanItemPriority,
  type PlanItemStatus,
  type UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";
import type { PlanItemRow } from "@/lib/hooks/odontogram";
import { notify } from "@/lib/utils/notify";
import {
  PLAN_ITEM_PRIORITY_META,
  PLAN_ITEM_STATUS_META,
  describePlanItem,
} from "./plan-item-display";

/**
 * Estado y prioridad como PROPIEDADES INLINE de la fila (skill
 * `ui-interacciones`, patrón «propiedad inline»): el valor visible es el
 * disparador y su selector se abre ahí mismo.
 *
 * Antes vivían dentro del menú ⋯, primero como 10 radios planos (menú con
 * scroll) y luego como submenús. Un menú contextual es para ACCIONES; esconder
 * una propiedad editable detrás de él obliga a un salto y a memorizar dónde
 * estaba. Con el valor-como-disparador, ver el estado y cambiarlo son el mismo
 * gesto — y el menú ⋯ queda para lo único que es una acción de verdad: quitar
 * la línea.
 *
 * Cada opción del selector pinta el MISMO `StatusBadge` que la tabla: la
 * opción se ve exactamente como quedará al elegirla, y no se inventa ningún
 * color fuera de los tonos del sistema.
 */

interface PropertySelectBaseProps {
  row: PlanItemRow;
  /** `true` mientras esta línea tiene una mutación en vuelo. */
  pending: boolean;
  onUpdate: (itemId: string, changes: UpdatePlanItemRequest) => Promise<boolean>;
}

/**
 * Aviso único para el doble disparo: el hook ya descarta la segunda mutación en
 * silencio, y un clic que no hace nada ni dice nada se lee como pantalla rota.
 */
function warnPending(): void {
  notify.info("Hay un cambio en curso", {
    description:
      "Espera a que termine el cambio anterior de esta línea e inténtalo otra vez.",
  });
}

/** Clases compartidas de los dos disparadores (foco visible, hover, target). */
const TRIGGER_CLASS =
  "group inline-flex touch-manipulation items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 aria-[busy=true]:cursor-progress aria-[busy=true]:opacity-60";

export function PlanItemStatusSelect({
  row,
  pending,
  onUpdate,
}: PropertySelectBaseProps) {
  const { item } = row;
  const status: PlanItemStatus = item.status ?? "plan";
  const meta = PLAN_ITEM_STATUS_META[status];
  const label = describePlanItem(item, row.teeth);

  const handleChange = (next: string) => {
    if (next === status) return; // Re-elegir lo vigente no es un cambio.
    if (pending) {
      warnPending();
      return;
    }
    const nextMeta = PLAN_ITEM_STATUS_META[next as PlanItemStatus];
    if (!nextMeta) return;
    void onUpdate(item.id, { status: next as PlanItemStatus }).then((saved) => {
      if (!saved) return; // Del fallo ya avisó el hook.
      notify.success(`Línea marcada como «${nextMeta.label.toLowerCase()}»`, {
        description:
          next === "canceled"
            ? `«${item.serviceName}» sale del total del plan. Sigue en la lista, tachada, para dejar constancia.`
            : `Se actualizó «${item.serviceName}».`,
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-busy={pending || undefined}
          aria-label={`Cambiar estado de ${label}: ${meta.label}`}
          className={TRIGGER_CLASS}
        >
          {/* La pill ES el disparador (un solo hit target, sin zonas muertas).
              El chevron va DENTRO de ella para no crear un segundo objetivo, y
              el hover sube el contraste con un anillo en vez de bajar nada. */}
          <StatusBadge
            tone={meta.tone}
            className="gap-1 transition-shadow group-hover:ring-1 group-hover:ring-hairline"
          >
            {meta.label}
            <ChevronDown aria-hidden="true" className="h-3 w-3 opacity-70" />
          </StatusBadge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup value={status} onValueChange={handleChange}>
          {PLAN_ITEM_STATUSES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <StatusBadge tone={PLAN_ITEM_STATUS_META[value].tone}>
                {PLAN_ITEM_STATUS_META[value].label}
              </StatusBadge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlanItemPrioritySelect({
  row,
  pending,
  onUpdate,
}: PropertySelectBaseProps) {
  const { item } = row;
  const priority: PlanItemPriority = item.priority ?? "media";
  const meta = PLAN_ITEM_PRIORITY_META[priority];
  const label = describePlanItem(item, row.teeth);

  const handleChange = (next: string) => {
    if (next === priority) return;
    if (pending) {
      warnPending();
      return;
    }
    const nextMeta = PLAN_ITEM_PRIORITY_META[next as PlanItemPriority];
    if (!nextMeta) return;
    void onUpdate(item.id, { priority: next as PlanItemPriority }).then(
      (saved) => {
        if (!saved) return;
        notify.success(`Prioridad ${nextMeta.label.toLowerCase()}`, {
          description: `«${item.serviceName}» pasa a prioridad ${nextMeta.label.toLowerCase()}.`,
        });
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Propiedad SECUNDARIA: mismo patrón que el estado pero con menos
            jerarquía — texto pequeño, no otra pill, para que la columna siga
            teniendo un solo foco visual. El icono sube a `danger` solo en
            alta: la urgencia se ve sin leer, y la etiqueta la confirma (nada
            se comunica solo con color). */}
        <button
          type="button"
          aria-busy={pending || undefined}
          aria-label={`Cambiar prioridad de ${label}: ${meta.label}`}
          className={`${TRIGGER_CLASS} gap-1 rounded-md px-1 py-0.5 text-xs text-subtle hover:bg-hover hover:text-ink`}
        >
          <SignalHigh
            aria-hidden="true"
            className={
              priority === "alta" ? "h-3.5 w-3.5 text-destructive" : "h-3.5 w-3.5"
            }
          />
          {meta.label}
          <ChevronDown aria-hidden="true" className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuRadioGroup value={priority} onValueChange={handleChange}>
          {PLAN_ITEM_PRIORITIES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {PLAN_ITEM_PRIORITY_META[value].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
