"use client";

import type { ReactNode } from "react";
import { Archive, Pencil, RotateCcw } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/primitives/shadcn/tooltip";
import { cn } from "@/lib/utils/utils";

export interface CatalogListRowProps {
  /** Acento/indicador a la izquierda (punto de color, avatar…). Opcional. */
  leading?: ReactNode;
  /** Título de la fila (nombre en negrita, chip de etiqueta…). */
  title: ReactNode;
  /** Badge/meta junto al título (p.ej. "Atiende citas"). Opcional. */
  meta?: ReactNode;
  /** Descripción (segunda línea). `null`/vacío → "Sin descripción" en itálica. */
  description?: string | null;
  /** Archivado → fila atenuada + badge + acción Restaurar. */
  archived: boolean;
  /** Nombre para los `aria-label` de las acciones. */
  entityName: string;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

/**
 * CatalogListRow — fila de la vista LISTA de un catálogo (Etiquetas, Tipos de
 * usuario…). Diseño 2026: dos líneas con jerarquía clara (título + badge
 * arriba, descripción debajo), acento lateral a la izquierda, y acciones a la
 * derecha siempre visibles pero de baja emfasis (se realzan al hover/focus).
 */
export function CatalogListRow({
  leading,
  title,
  meta,
  description,
  archived,
  entityName,
  onEdit,
  onArchive,
  onRestore,
}: CatalogListRowProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-hover/40",
        archived && "opacity-60",
      )}
    >
      {leading && <span className="mt-1 shrink-0">{leading}</span>}

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          {meta}
          {archived && (
            <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-medium text-subtle">
              Archivado
            </span>
          )}
        </div>
        <p
          className={cn(
            "truncate text-xs",
            description ? "text-subtle" : "italic text-subtle/50",
          )}
        >
          {description || "Sin descripción"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 self-center">
        {archived ? (
          <button
            type="button"
            onClick={onRestore}
            aria-label={`Restaurar ${entityName}`}
            className={cn(
              "flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[11px] font-medium text-subtle",
              "outline-none transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand",
              "focus-visible:ring-2 focus-visible:ring-brand/40",
            )}
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar
          </button>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={`Editar ${entityName}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle/70 outline-none transition-colors hover:bg-hover hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45 group-hover:text-subtle"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onArchive}
                  aria-label={`Archivar ${entityName}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle/70 outline-none transition-colors hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-400/40 group-hover:text-subtle dark:hover:text-amber-400"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Archivar</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
