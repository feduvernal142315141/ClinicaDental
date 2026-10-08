import { cn } from "@/lib/utils/utils";

/**
 * Estados de carga de Finanzas homologados con el resto de módulos: el mismo esqueleto que
 * pinta `DataTable` (barras `bg-hover` con `animate-pulse`), sin spinners de color.
 * Cada esqueleto anuncia la carga a lectores de pantalla con `aria-busy` y un texto oculto.
 */

export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("h-4 animate-pulse rounded bg-hover", className)} />;
}

/** `label = null`: esqueleto anidado dentro de otro que ya anuncia la carga. */
function Busy({ label, className, children }: { label: string | null; className?: string; children: React.ReactNode }) {
  if (label === null) return <div className={className}>{children}</div>;
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Tabla en carga: cabecera `bg-elevated` y filas de barras, como `DataTable`. */
export function TableSkeleton({
  columns = 5,
  rows = 6,
  label = "Cargando…",
  className,
}: {
  columns?: number;
  rows?: number;
  label?: string | null;
  className?: string;
}) {
  return (
    <Busy label={label} className={cn("overflow-hidden rounded-xl border border-hairline", className)}>
      <div className="grid gap-4 border-b border-hairline bg-elevated px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBar key={i} className="h-3 max-w-[90px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b border-hairline px-4 py-3.5 last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBar key={c} className="max-w-[140px]" />
          ))}
        </div>
      ))}
    </Busy>
  );
}

/** Tarjetas de indicadores en carga. */
export function CardsSkeleton({
  count = 4,
  label = "Cargando…",
  className,
}: {
  count?: number;
  label?: string | null;
  className?: string;
}) {
  return (
    <Busy label={label} className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bento space-y-3 p-4">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-6 w-32" />
        </div>
      ))}
    </Busy>
  );
}

/** Bloque de líneas (secciones de formulario, listas cortas). */
export function LinesSkeleton({
  lines = 3,
  label = "Cargando…",
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Busy label={label} className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} className={i % 2 === 0 ? "w-full" : "w-3/4"} />
      ))}
    </Busy>
  );
}

/** Página de detalle o formulario en carga: título, bloque de datos y tabla. */
export function DetailSkeleton({ label = "Cargando…" }: { label?: string }) {
  return (
    <Busy label={label} className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-64" />
        <SkeletonBar className="h-4 w-40" />
      </div>
      <div className="bento grid gap-4 p-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="w-28" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={5} rows={4} label={null} />
    </Busy>
  );
}

/** Pantalla completa de Finanzas mientras se consulta si el módulo está activo. */
export function PageSkeleton({ label = "Cargando Finanzas…" }: { label?: string }) {
  return (
    <Busy label={label} className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-48" />
        <SkeletonBar className="h-4 w-72" />
      </div>
      <CardsSkeleton label={null} />
      <TableSkeleton label={null} />
    </Busy>
  );
}
