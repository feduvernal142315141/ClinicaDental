"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Users } from "lucide-react";
import type { SchedulerDoctorOption } from "@/lib/entity/appointment";
import type { Label } from "@/lib/entity/label";
import { SearchInput } from "@/components/ui/atomic/forms/search-input";
import { DynamicIcon } from "@/components/app/labels/DynamicIcon";
import { useLabelCatalog } from "@/lib/hooks/labels";
import { cn } from "@/lib/utils/utils";

/** Máximo de chips de etiqueta que se pintan en el sidebar; el resto se
 * resume en un indicador no-interactivo que remite al buscador. */
const SIDEBAR_CHIP_CAP = 24;

interface AppointmentsSpecialistSidebarProps {
  doctors: SchedulerDoctorOption[];
  visibleDoctorIds: Set<string>;
  onToggleDoctor: (doctorId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onNewAppointment: () => void;
  canCreate: boolean;
  loading?: boolean;
  selectedLabelIds: Set<string>;
  onToggleLabel: (labelId: string) => void;
  onClearLabels: () => void;
}

// Texto legible (oscuro/blanco) sobre un color de DATO según luminancia
// percibida — evita texto blanco de bajo contraste sobre colores claros de la
// paleta (verde/cian/ámbar/lima). WCAG-conscious.
function readableText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1f2937" : "#ffffff";
}

// Píldora de conteo compacta (p.ej. "5/5"). nowrap para no partirse nunca.
function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-hover px-1.5 py-0.5 text-[10px] font-bold leading-none text-subtle tabular-nums">
      {children}
    </span>
  );
}

// Encabezado de sección: micro-label uppercase (jerarquía secundaria Bento).
// nowrap: el título se muestra SIEMPRE completo; en anchos estrechos la fila
// del encabezado (flex-wrap) baja las acciones a una segunda línea.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
      {children}
    </span>
  );
}

// Acción de texto compacta (Todos / Ninguno / Limpiar).
function TextAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-brand outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:text-subtle disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ── Fila de especialista ────────────────────────────────────────────────────
// Patrón "toggle de calendario" (Google/Notion): el avatar de color ES la
// identidad y el control. Seleccionado → avatar a color pleno + badge de check;
// no seleccionado → avatar en gris atenuado. Sin barras pastel ni borde de
// acento (lo que se veía recargado). Fila seleccionada con `bg-hover` sutil.
function DoctorRow({
  doctor,
  checked,
  onToggle,
}: {
  doctor: SchedulerDoctorOption;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      title={doctor.name}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
        checked ? "bg-hover" : "hover:bg-hover/60",
      )}
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full text-sm font-semibold transition-all duration-150",
            !checked && "opacity-40 grayscale",
          )}
          style={{
            backgroundColor: doctor.color,
            color: readableText(doctor.color),
          }}
        >
          {doctor.name.charAt(0).toUpperCase()}
        </span>
        {checked && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-[15px] w-[15px] place-items-center rounded-full bg-surface shadow-sm ring-1 ring-hairline">
            <Check className="h-2.5 w-2.5 text-brand" strokeWidth={3.5} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13px] font-semibold leading-tight transition-colors",
            checked ? "text-ink" : "text-subtle",
          )}
        >
          {doctor.name}
        </span>
        {doctor.specialty && (
          <span className="block truncate text-[11px] leading-tight text-subtle">
            {doctor.specialty}
          </span>
        )}
      </span>
    </button>
  );
}

// ── Chip de etiqueta ──────────────────────────────────────────────────────────
// Dos estados claros por FORMA (no por opacidad, WCAG 1.4.1):
//  - no seleccionado = outlined (borde hairline + punto de color + texto a contraste).
//  - seleccionado = filled (tinte + borde del color + check).
function LabelFilterChip({
  label,
  selected,
  onToggle,
}: {
  label: Label;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
        !selected && "border-hairline bg-transparent hover:bg-hover",
      )}
      style={
        selected
          ? { backgroundColor: `${label.color}1f`, borderColor: label.color }
          : undefined
      }
    >
      {selected ? (
        <Check aria-hidden className="h-3 w-3 shrink-0" strokeWidth={3} />
      ) : (
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: label.color }}
        />
      )}
      {label.icon && <DynamicIcon name={label.icon} size={13} />}
      <span className="truncate">{label.name}</span>
    </button>
  );
}

// ── Sección de etiquetas (resuelve sus datos internamente) ───────────────────
function LabelFilterSection({
  selectedLabelIds,
  onToggle,
  onClear,
}: {
  selectedLabelIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  // Estrategia híbrida (ver useLabelCatalog): catálogo completo en cliente
  // cuando total <= CATALOG_PAGE_SIZE, búsqueda server-side si no. `results`
  // ya viene filtrado por `query` en ambos casos — transparente para la UI.
  const { total, results, query, search } = useLabelCatalog(false);

  // `total === 0` cubre tanto "aún cargando la primera página" como
  // "catálogo vacío" (pagination.total solo se fija tras la 1ª carga
  // exitosa), evitando que la sección parpadee oculta en búsquedas
  // posteriores como pasaba con el `loading` del hook anterior.
  if (total === 0) return null;

  const activeResults = results.filter((l) => !l.isArchived);

  // Badge de conteo: SIEMPRE sobre la selección real (viene del padre), no
  // sobre lo cargado — una etiqueta seleccionada fuera de la página actual
  // sigue contando y sigue siendo limpiable vía `onClear`.
  const selectedCount = selectedLabelIds.size;

  // Prioriza SIEMPRE las seleccionadas primero, luego recorta a
  // SIDEBAR_CHIP_CAP para que el sidebar no crezca sin límite.
  const orderedResults = [
    ...activeResults.filter((l) => selectedLabelIds.has(l.id)),
    ...activeResults.filter((l) => !selectedLabelIds.has(l.id)),
  ];
  const visibleLabels = orderedResults.slice(0, SIDEBAR_CHIP_CAP);
  const overflowCount = orderedResults.length - visibleLabels.length;

  return (
    <div className="border-t border-hairline pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex shrink-0 items-center gap-1.5">
          <SectionTitle>Etiquetas</SectionTitle>
          {selectedCount > 0 && <CountBadge>{selectedCount}</CountBadge>}
        </div>
        {selectedCount > 0 && (
          <span className="ml-auto">
            <TextAction onClick={onClear}>Limpiar</TextAction>
          </span>
        )}
      </div>
      {/* Minimalista: el buscador solo aparece cuando hay suficientes
          etiquetas como para que buscar aporte algo (sobre el total real,
          no solo lo ya cargado). */}
      {total > 5 && (
        <div className="mb-2">
          <SearchInput
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Buscar etiqueta..."
            aria-label="Buscar etiqueta"
          />
        </div>
      )}
      <div
        role="group"
        aria-label="Filtrar por etiqueta"
        className="flex flex-wrap gap-1.5"
      >
        {visibleLabels.map((label) => (
          <LabelFilterChip
            key={label.id}
            label={label}
            selected={selectedLabelIds.has(label.id)}
            onToggle={() => onToggle(label.id)}
          />
        ))}
        {overflowCount > 0 && (
          <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-hairline px-2.5 py-1 text-[12px] font-medium text-subtle">
            +{overflowCount} más — usa el buscador
          </span>
        )}
        {orderedResults.length === 0 && (
          <p className="text-xs text-subtle">
            Sin etiquetas que coincidan con «{query.trim()}».
          </p>
        )}
      </div>
    </div>
  );
}

export function AppointmentsSpecialistSidebar({
  doctors,
  visibleDoctorIds,
  onToggleDoctor,
  onSelectAll,
  onClearAll,
  onNewAppointment,
  canCreate,
  loading,
  selectedLabelIds,
  onToggleLabel,
  onClearLabels,
}: AppointmentsSpecialistSidebarProps) {
  // Buscador en cliente: pura presentación, no añade datos ni fetch.
  const [query, setQuery] = useState("");

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty?.toLowerCase().includes(q) ?? false),
    );
  }, [doctors, query]);

  const visibleCount = useMemo(
    () => doctors.filter((d) => visibleDoctorIds.has(d.id)).length,
    [doctors, visibleDoctorIds],
  );
  const total = doctors.length;
  const allVisible = total > 0 && visibleCount === total;
  const noneVisible = visibleCount === 0;

  return (
    // Único scroller del panel: el propio aside (sin huecos muertos; con pocos
    // especialistas el contenido se apila arriba y Etiquetas va justo debajo).
    <aside
      aria-label="Filtros de la agenda"
      className="bento flex h-full flex-col gap-4 overflow-y-auto p-4"
    >
      {/* Nivel 1 — CTA */}
      {canCreate && (
        <button
          type="button"
          onClick={onNewAppointment}
          className="auth-sheen relative flex h-11 w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand text-sm font-semibold text-white shadow-sm outline-none transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </button>
      )}

      {/* Nivel 2 — ESPECIALISTAS */}
      <section className="flex flex-col gap-2">
        {/* flex-wrap: si "Especialistas 5/5" + acciones no caben en una línea,
            Todos/Ninguno bajan a la siguiente en vez de montarse sobre el título. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex shrink-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            <SectionTitle>Especialistas</SectionTitle>
            {total > 0 && (
              <CountBadge>
                {visibleCount}/{total}
              </CountBadge>
            )}
          </div>
          {/* ml-auto: al envolver a segunda línea las acciones quedan pegadas
              a la derecha, no colgando a la izquierda. */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <TextAction onClick={onSelectAll} disabled={allVisible}>
              Todos
            </TextAction>
            <TextAction onClick={onClearAll} disabled={noneVisible}>
              Ninguno
            </TextAction>
          </div>
        </div>

        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar especialista..."
          aria-label="Buscar especialista"
        />

        <div
          role="group"
          aria-label="Filtrar por especialista"
          className="flex flex-col gap-0.5"
        >
          {loading &&
            doctors.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-hover" />
            ))}

          {filteredDoctors.map((doctor) => (
            <DoctorRow
              key={doctor.id}
              doctor={doctor}
              checked={visibleDoctorIds.has(doctor.id)}
              onToggle={() => onToggleDoctor(doctor.id)}
            />
          ))}

          {!loading && doctors.length === 0 && (
            <p className="py-6 text-center text-sm text-subtle">
              No hay especialistas registrados
            </p>
          )}

          {!loading && doctors.length > 0 && filteredDoctors.length === 0 && (
            <p className="py-6 text-center text-sm text-subtle">
              Sin coincidencias para “{query.trim()}”
            </p>
          )}
        </div>
      </section>

      {/* Nivel 3 — ETIQUETAS */}
      <LabelFilterSection
        selectedLabelIds={selectedLabelIds}
        onToggle={onToggleLabel}
        onClear={onClearLabels}
      />
    </aside>
  );
}
