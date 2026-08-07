"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Layers, RotateCw, Stethoscope } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import type { UseAddToPlanCatalogResult } from "@/lib/hooks/odontogram";
import type { AddPlanItemRequest } from "@/lib/entity/odontogram";
import type { ServiceListItem } from "@/lib/entity/services";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { notify } from "@/lib/utils/notify";
import { PlanToothSelector, formatSelectedTeeth } from "./PlanToothSelector";
import { ServicePickerList } from "./ServicePickerList";

type AddToPlanScope = "tooth" | "general";

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

interface AddToPlanPanelProps {
  catalog: UseAddToPlanCatalogResult;
  /** Moneda del plan (o de la clínica si aún no tiene líneas). */
  currency: string;
  /**
   * Cuelga las líneas del plan del paciente, creándolo si hace falta. Nunca
   * lanza: devuelve `null` cuando falló y el error ya se avisó con el mensaje
   * real del backend.
   */
  onAdd: (items: AddPlanItemRequest[]) => Promise<number | null>;
  /** Se llama SOLO cuando el servidor confirmó. El host cierra el panel. */
  onAdded: () => void;
}

/**
 * AddToPlanPanel
 *
 * Cuerpo del panel "Añadir al plan": dos catálogos excluyentes en pestañas,
 * buscador, chips de categoría y selección múltiple.
 *
 * Abre en **Generales** aunque sea la segunda pestaña. Esa mitad del catálogo
 * (`odontogramEnabled=false`: profilaxis, radiografías, consultas) no se puede
 * planificar desde ninguna otra pantalla, mientras que la otra ya tiene su vía
 * natural en el odontograma. Es el motivo por el que existe este panel.
 *
 * Las pestañas parten el CATÁLOGO, no el envío: "Añadir al plan" manda en un
 * solo POST lo elegido en las dos (el cuerpo admite líneas heterogéneas) y el
 * pie cuenta el total real. Mandar solo la pestaña visible y limpiar las dos al
 * terminar borraba en silencio lo marcado en la otra —justo lo que su contador
 * seguía prometiendo— en un presupuesto que el paciente firma.
 *
 * Lo que NO hace este panel, a propósito:
 * - No manda importes. `unitCost` y `currencyCode` los congela el servidor con
 *   la tarifa del catálogo en el momento de añadir; el importe del pie es una
 *   ESTIMACIÓN previa y se rotula como tal.
 * - No manda `syncKey`. Esa clave es la idempotencia del puente odontograma →
 *   plan; usarla aquí impediría presupuestar dos veces el mismo servicio sobre
 *   la misma pieza, que a mano es una petición legítima (dos sesiones, dos
 *   piezas gemelas re-tratadas).
 * - No manda `quantity`, `phase` ni `sessionsPlanned`: el servidor tiene sus
 *   valores por defecto (1, sin fase, 1) y aún no hay pantalla para editarlos.
 */
export function AddToPlanPanel({
  catalog,
  currency,
  onAdd,
  onAdded,
}: AddToPlanPanelProps) {
  const uid = useId();
  const hintId = `${uid}-hint`;

  const [scope, setScope] = useState<AddToPlanScope>("general");
  // Una selección POR PESTAÑA: cambiar de pestaña no puede tirar en silencio lo
  // que el usuario llevaba elegido en la otra. El contador del rótulo de cada
  // pestaña lo deja a la vista.
  const [selectedByScope, setSelectedByScope] = useState<
    Record<AddToPlanScope, ReadonlySet<string>>
  >({ tooth: EMPTY_SELECTION, general: EMPTY_SELECTION });
  const [teeth, setTeeth] = useState<ReadonlySet<number>>(new Set<number>());
  const [submitting, setSubmitting] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const { generalServices, toothServices, loading, error, retry } = catalog;

  const toggleService = useCallback(
    (serviceId: string, checked: boolean) => {
      setSelectedByScope((prev) => {
        const next = new Set(prev[scope]);
        if (checked) next.add(serviceId);
        else next.delete(serviceId);
        return { ...prev, [scope]: next };
      });
    },
    [scope],
  );

  const toggleTooth = useCallback((fdi: number) => {
    setTeeth((prev) => {
      const next = new Set(prev);
      if (next.has(fdi)) next.delete(fdi);
      else next.add(fdi);
      return next;
    });
  }, []);

  const clearTeeth = useCallback(() => setTeeth(new Set<number>()), []);

  // Se resuelven las DOS pestañas, no solo la visible: el envío es uno solo y
  // se lleva todo lo elegido. Filtrar por la pestaña activa mandaba la mitad y
  // borraba la otra al terminar, así que lo que el usuario había marcado en la
  // pestaña de al lado —y que su contador seguía anunciando— desaparecía sin un
  // aviso, en un presupuesto que el paciente firma.
  const toothSelected = useMemo(
    () =>
      toothServices.filter((service) =>
        selectedByScope.tooth.has(service.id),
      ),
    [toothServices, selectedByScope.tooth],
  );
  const generalSelected = useMemo(
    () =>
      generalServices.filter((service) =>
        selectedByScope.general.has(service.id),
      ),
    [generalServices, selectedByScope.general],
  );
  const selectedCount = toothSelected.length + generalSelected.length;

  const orderedTeeth = useMemo(
    () => Array.from(teeth).sort((a, b) => a - b),
    [teeth],
  );

  // Una línea por servicio y pieza: el servidor cobra cada línea a su precio
  // unitario (cantidad × coste), así que meter tres piezas en una sola línea
  // presupuestaría tres empastes al precio de uno. La tabla del plan también
  // está pensada para leerse pieza a pieza ("Diente 16").
  const toothLineCount = toothSelected.length * orderedTeeth.length;
  const generalLineCount = generalSelected.length;
  const estimate =
    sumServiceCost(toothSelected) * orderedTeeth.length +
    sumServiceCost(generalSelected);

  /** Por qué no se puede añadir todavía, en texto. `null` si sí se puede. */
  const blockedReason: string | null =
    selectedCount === 0
      ? "Selecciona al menos un servicio."
      : toothSelected.length > 0 && orderedTeeth.length === 0
        ? // Nombra la pestaña: el bloqueo puede venir de la que no está a la
          // vista, y sin decirlo el botón parecería roto sin motivo.
          "Indica al menos una pieza para los servicios de «Sobre una pieza»."
        : null;

  const handleSubmit = useCallback(async () => {
    if (blockedReason || submitting) return;

    const items: AddPlanItemRequest[] = [
      ...toothSelected.flatMap((service) =>
        orderedTeeth.map((fdi) => ({
          serviceId: service.id,
          toothNumbers: JSON.stringify([fdi]),
        })),
      ),
      ...generalSelected.map((service) => ({ serviceId: service.id })),
    ];

    setSubmitting(true);
    const created = await onAdd(items);
    if (mountedRef.current) setSubmitting(false);

    // `null` = falló y `onAdd` ya avisó con el mensaje real del backend (plan
    // no activo, monedas mezcladas, servicio inactivo…). El panel se queda
    // abierto CON la selección puesta: cerrarlo obligaría a rehacerla a ciegas.
    if (created === null) return;

    if (created === 0) {
      notify.info("No se añadió ninguna línea", {
        description:
          "El servidor no creó ninguna línea nueva. Revisa el plan por si ya estaban presupuestadas.",
      });
    } else {
      notify.success(
        created === 1 ? "1 línea añadida al plan" : `${created} líneas añadidas al plan`,
        {
          description:
            "Ya aparecen en el plan de tratamiento con el importe congelado y el estado «Propuesto».",
        },
      );
    }

    if (mountedRef.current) {
      setSelectedByScope({ tooth: EMPTY_SELECTION, general: EMPTY_SELECTION });
      setTeeth(new Set<number>());
    }
    onAdded();
  }, [
    blockedReason,
    generalSelected,
    onAdd,
    onAdded,
    orderedTeeth,
    submitting,
    toothSelected,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center">
        <LoadingSpinner message="Cargando catálogo de servicios..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center px-4">
        <Alert variant="destructive" live>
          <AlertTriangle />
          <AlertTitle>No se pudo cargar el catálogo</AlertTitle>
          <AlertDescription>
            {/* Mensaje REAL del backend: es lo único que dice qué pasó. */}
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retry}
              className="mt-1 gap-2"
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={scope}
        onValueChange={(value) => setScope(value as AddToPlanScope)}
        className="flex min-h-0 flex-1 flex-col px-4"
      >
        <div className="shrink-0 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="tooth">
              <Stethoscope aria-hidden="true" className="h-4 w-4" />
              Sobre una pieza
              <SelectionCount count={selectedByScope.tooth.size} />
            </TabsTrigger>
            <TabsTrigger value="general">
              <Layers aria-hidden="true" className="h-4 w-4" />
              Generales
              <SelectionCount count={selectedByScope.general.size} />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Radix desmonta la pestaña inactiva: la búsqueda y el chip de
            categoría se reinician al cambiar de pestaña (son efímeros), pero la
            SELECCIÓN sobrevive porque vive aquí arriba. */}
        <TabsContent
          value="tooth"
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <p className="shrink-0 text-xs text-subtle">
            Estos son los servicios que se marcan sobre el odontograma. Se
            añadirá <strong className="font-semibold">una línea por pieza</strong>{" "}
            y servicio.
          </p>
          <PlanToothSelector
            selected={teeth}
            onToggle={toggleTooth}
            onClear={clearTeeth}
            disabled={submitting}
          />
          <ServicePickerList
            services={toothServices}
            selectedIds={selectedByScope.tooth}
            onToggle={toggleService}
            currency={currency}
            searchPlaceholder="Buscar servicio por pieza…"
            disabled={submitting}
            emptyCatalog={
              <EmptyState
                icon={Stethoscope}
                title="No hay servicios para el odontograma"
                description="Ningún servicio activo tiene «Visible en odontograma» activado. Puedes cambiarlo en Ajustes › Servicios."
              />
            }
          />
        </TabsContent>

        <TabsContent
          value="general"
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <p className="shrink-0 text-xs text-subtle">
            Aquí solo aparecen los servicios con «Visible en odontograma»
            desactivado. Los que se marcan sobre una pieza están en la otra
            pestaña.
          </p>
          <ServicePickerList
            services={generalServices}
            selectedIds={selectedByScope.general}
            onToggle={toggleService}
            currency={currency}
            searchPlaceholder="Buscar servicio general…"
            disabled={submitting}
            emptyCatalog={
              <EmptyState
                icon={Layers}
                title="Esta clínica no tiene servicios generales"
                description="Un servicio es general cuando tiene «Visible en odontograma» desactivado. Desactívalo en Ajustes › Servicios para poder presupuestarlo aquí."
              />
            }
          />
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-hairline px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* `role="status"` (WCAG 2.2 — 4.1.3): marcar una casilla solo se
              anuncia como "casilla marcada". Cuántas líneas se van a crear y
              por cuánto —y, si está bloqueado, qué falta— es justo lo que evita
              presupuestar 6 líneas creyendo que son 2, y sin esto no llega
              nunca a un lector de pantalla. */}
          <div role="status" className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {selectedCount}{" "}
              {selectedCount === 1 ? "seleccionado" : "seleccionados"}
              {" · "}
              <span className="tabular-nums">
                {formatClinicCurrencyExact(estimate, currency)}
              </span>
            </p>
            <p id={hintId} className="mt-0.5 text-xs text-subtle">
              {blockedReason ??
                // Ni "N seleccionados" ni el importe describen lo que va a
                // pasar cuando una pieza multiplica las líneas: 2 servicios
                // sobre 3 piezas son 6 líneas, y eso hay que decirlo ANTES.
                `${describePendingLines(
                  toothLineCount,
                  generalLineCount,
                  teeth,
                )} Importe orientativo: el definitivo lo congela el servidor con la tarifa del catálogo.`}
            </p>
          </div>

          {/* `aria-disabled` y NO `disabled`: un botón deshabilitado de verdad
              no es enfocable, así que su `aria-describedby` —el único sitio
              donde pone qué falta— no se lee jamás. Enfocable y sin efecto:
              `handleSubmit` ya sale por `blockedReason`. */}
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            aria-disabled={Boolean(blockedReason) || submitting}
            aria-describedby={hintId}
            className="shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {submitting ? "Añadiendo…" : "Añadir al plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function sumServiceCost(services: ServiceListItem[]): number {
  return services.reduce((sum, service) => sum + (service.cost ?? 0), 0);
}

/**
 * "Se añadirán 6 líneas: 4 sobre las piezas 16, 17 y 2 generales."
 *
 * El desglose no es cosmético: el envío se lleva SIEMPRE las dos pestañas y
 * solo una está a la vista, así que el recuento tiene que nombrar de dónde sale
 * cada parte.
 */
function describePendingLines(
  toothLines: number,
  generalLines: number,
  teeth: ReadonlySet<number>,
): string {
  const total = toothLines + generalLines;
  const lines = `${total} ${total === 1 ? "línea" : "líneas"}`;
  const teethLabel = `${teeth.size === 1 ? "la pieza" : "las piezas"} ${formatSelectedTeeth(teeth)}`;

  if (toothLines > 0 && generalLines > 0) {
    return `Se añadirán ${lines}: ${toothLines} sobre ${teethLabel} y ${generalLines} ${
      generalLines === 1 ? "general" : "generales"
    }.`;
  }
  if (toothLines > 0) {
    return `Se añadirán ${lines} sobre ${teethLabel}.`;
  }
  return `Se añadirán ${lines} ${total === 1 ? "general" : "generales"}.`;
}

/** Contador de la pestaña inactiva: nada elegido se queda fuera de la vista. */
function SelectionCount({ count }: { count: number }) {
  if (count === 0) return null;
  // `bg-brand-strong` y no `bg-brand`: en tema oscuro `--brand` se aclara a
  // blue-500 y el texto blanco baja a 3.68:1 (falla AA). Misma decisión que
  // `buttonVariants` (components/ui/primitives/shadcn/button.tsx).
  return (
    <span className="rounded-full bg-brand-strong px-1.5 text-[10px] font-semibold tabular-nums text-white">
      {count}
      <span className="sr-only"> seleccionados</span>
    </span>
  );
}
