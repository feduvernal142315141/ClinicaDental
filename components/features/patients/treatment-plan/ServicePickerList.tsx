"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Checkbox,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import type { ServiceListItem } from "@/lib/entity/services";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { matchesQuery } from "@/lib/utils/text";
import { cn } from "@/lib/utils/utils";
import {
  ALL_CATEGORIES_KEY,
  UNCATEGORIZED_KEY,
  buildCategoryChips,
  buildServiceSearchText,
  formatServiceMeta,
} from "./service-catalog-display";

interface ServicePickerListProps {
  services: ServiceListItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (serviceId: string, checked: boolean) => void;
  /** Moneda con la que pintar los precios de CATÁLOGO (aún no congelados). */
  currency: string;
  /** Texto del campo de búsqueda; nombra también el `<label>` oculto. */
  searchPlaceholder: string;
  /** Qué pintar cuando el catálogo entero está vacío (no cuando filtra). */
  emptyCatalog: ReactNode;
  disabled?: boolean;
}

/**
 * Chips de categoría sobre el `ToggleGroup` compartido, que está pensado como
 * control segmentado (piezas pegadas que se reparten el ancho). Aquí son
 * píldoras que envuelven, así que se revierten sus cuatro decisiones de
 * segmento: reparto del ancho (`flex-1`), esquinas de extremo, borde izquierdo
 * colapsado y el `shadow` del grupo. El resto —foco, teclado y estado— se
 * hereda tal cual.
 */
const CHIP_CLASS = cn(
  // `first:rounded-l-full` y no `first:rounded-full`: las esquinas de extremo
  // del segmento son utilidades POR LADO, y una `rounded-full` genérica no las
  // desplaza (ni en tailwind-merge ni en la cascada), así que el primer chip se
  // quedaba con el lado izquierdo cuadrado.
  "flex-none rounded-full first:rounded-l-full last:rounded-r-full",
  "h-8 gap-1.5 border-hairline px-3 text-xs font-medium",
  "data-[variant=outline]:border-l",
  // El hover de la variante `outline` del primitivo es `hover:bg-accent
  // hover:text-accent-foreground` (toggle.tsx:19) y `--accent` es VIOLETA en
  // los dos temas (globals.css:23 y :89), un color que no sale en ninguna otra
  // parte de esta pantalla y que además compite con el chip activo.
  "text-subtle hover:bg-hover hover:text-ink",
  // `brand-strong` y no `brand`: en tema oscuro `--brand` se aclara a blue-500
  // y el texto blanco se queda en 3.68:1 (AA exige 4.5:1). Es la misma decisión
  // ya tomada en `buttonVariants` (components/ui/primitives/shadcn/button.tsx).
  // El par `hover` reafirma el activo por especificidad (0,3,0 > 0,2,0): sin él
  // el orden de la hoja decide, y en tablet el `:hover` se queda pegado tras el
  // toque.
  "data-[state=on]:border-brand-strong data-[state=on]:bg-brand-strong data-[state=on]:text-white",
  "data-[state=on]:hover:bg-brand-strong data-[state=on]:hover:text-white",
);

/**
 * ServicePickerList
 *
 * Buscador + chips de categoría + lista con selección múltiple sobre UN
 * catálogo de servicios. La usan las dos pestañas del panel "Añadir al plan"
 * con catálogos distintos (generales / por pieza).
 *
 * La búsqueda pasa por `matchesQuery`, así que es insensible a acentos y a
 * mayúsculas y admite varias palabras sueltas: "protesis sup" encuentra
 * "Prótesis superior". Busca sobre nombre, código y categoría traducida.
 *
 * La selección VIVE FUERA: la pestaña activa cambia y este componente se
 * desmonta, pero lo que el usuario llevaba elegido no puede desaparecer con él.
 */
export function ServicePickerList({
  services,
  selectedIds,
  onToggle,
  currency,
  searchPlaceholder,
  emptyCatalog,
  disabled = false,
}: ServicePickerListProps) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES_KEY);

  const chips = useMemo(() => buildCategoryChips(services), [services]);

  const visible = useMemo(() => {
    return services.filter((service) => {
      if (category !== ALL_CATEGORIES_KEY) {
        const key = service.category ?? UNCATEGORIZED_KEY;
        if (key !== category) return false;
      }
      return matchesQuery(buildServiceSearchText(service), query);
    });
  }, [services, category, query]);

  const filtered = query.trim().length > 0 || category !== ALL_CATEGORIES_KEY;

  if (services.length === 0) {
    return <>{emptyCatalog}</>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="shrink-0">
        <label htmlFor={`${uid}-search`} className="sr-only">
          {searchPlaceholder}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          />
          <Input
            id={`${uid}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
            className="pl-9"
          />
        </div>
      </div>

      {/* Un solo chip de categoría no filtra nada: todo el catálogo la comparte. */}
      {chips.length > 1 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={category}
          // Radix devuelve "" al deseleccionar el chip activo; eso aquí es
          // "sin filtro", no "ninguna categoría" (que dejaría la lista vacía
          // sin que nada en pantalla lo explique).
          onValueChange={(value) => setCategory(value || ALL_CATEGORIES_KEY)}
          aria-label="Filtrar por categoría"
          disabled={disabled}
          className="w-full shrink-0 flex-wrap justify-start gap-1.5 rounded-none shadow-none data-[variant=outline]:shadow-none"
        >
          {/* La jerarquía del contador se hace con el PESO, no con el alfa:
              `opacity-70` sobre el chip activo dejaba el número en ~2.6:1 en
              oscuro y ~3.6:1 en claro, o sea ilegible en los dos temas. */}
          <ToggleGroupItem value={ALL_CATEGORIES_KEY} className={CHIP_CLASS}>
            Todas
            <span className="font-normal tabular-nums">{services.length}</span>
          </ToggleGroupItem>
          {chips.map((chip) => (
            <ToggleGroupItem
              key={chip.value}
              value={chip.value}
              className={CHIP_CLASS}
            >
              {chip.label}
              <span className="font-normal tabular-nums">{chip.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Filtrar vacía la lista sin decir nada: el resultado de teclear en el
          buscador es un mensaje de estado (WCAG 2.2 — 4.1.3) y tiene que
          anunciarse, además de verse. Cubre también el caso de cero
          coincidencias. */}
      <p role="status" className="shrink-0 text-xs text-subtle">
        {filtered
          ? `${visible.length} de ${services.length} ${
              services.length === 1 ? "servicio" : "servicios"
            }`
          : `${services.length} ${
              services.length === 1 ? "servicio" : "servicios"
            }`}
      </p>

      {/* Único contenedor con scroll del panel. */}
      {/* SIN scroll propio: lo lleva el cuerpo de la pestaña que la contiene
          (AddToPlanPanel). Anidar un `overflow-y-auto` aquí dejaba la lista a
          merced del espacio sobrante y la aplastaba en cuanto se desplegaba el
          selector de piezas, además de crear la segunda barra que ADR-36
          prohíbe. La lista ocupa lo que necesita y el conjunto se desplaza. */}
      <div className="rounded-bento border border-hairline bg-surface">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-subtle">
            Ningún servicio coincide con la búsqueda.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((service) => {
              const checkboxId = `${uid}-service-${service.id}`;
              const meta = formatServiceMeta(service);
              const checked = selectedIds.has(service.id);

              return (
                <li key={service.id} className="flex items-start gap-3 px-3 py-2.5">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(state) =>
                      onToggle(service.id, state === true)
                    }
                    className="mt-1"
                  />
                  {/* La etiqueta cubre TODA la fila (nombre, ficha y precio):
                      es el nombre accesible de la casilla —el lector anuncia
                      "Limpieza dental, LIM-01 · 30 min, 40,00 Bs"— y a la vez
                      el blanco grande que exige WCAG 2.2 (2.5.8), que el
                      cuadrito de 16 px por sí solo no alcanza. */}
                  <label
                    htmlFor={checkboxId}
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {service.name}
                      </span>
                      {meta && (
                        <span className="block truncate text-xs text-subtle">
                          {meta}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-ink">
                      {formatClinicCurrencyExact(service.cost, currency)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
