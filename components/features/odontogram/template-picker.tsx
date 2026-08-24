"use client";

import { useMemo } from "react";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/odontogram/utils";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";
import { projectToCanonicalSurface, SURFACE_STATUS_COLORS } from "./types";
import type { CanonicalSurface, ToothSurface, ToothTemplate } from "./types";

export interface AppliedTemplateRecord {
  templateName: string;
  /** Celdas que la plantilla escribió de verdad. */
  affected: ToothSurface[];
}

interface TemplatePickerProps {
  /** Catálogo aplicable a ESTA pieza, entero. */
  templates: ToothTemplate[];
  toothNumber: number;
  /** Celdas marcadas ahora mismo en el selector de caras. */
  markedSurfaces: ToothSurface[];
  disabled?: boolean;
  /** Plantilla bajo el cursor o el foco. La eleva el padre porque el selector
   *  de caras de arriba pinta la misma previsualización. */
  previewTemplate: ToothTemplate | null;
  onPreviewChange: (template: ToothTemplate | null) => void;
  onApply: (template: ToothTemplate) => void;
  /** Última aplicación, para ofrecer deshacerla. `null` = nada que deshacer. */
  lastApplied: AppliedTemplateRecord | null;
  onUndo: () => void;
}

/** Celdas marcadas que una plantilla escribiría, y las que dejaría intactas. */
export function splitByTemplate(
  markedSurfaces: ToothSurface[],
  template: ToothTemplate,
): { affected: ToothSurface[]; ignored: ToothSurface[] } {
  // Las plantillas hablan en vocabulario CANÓNICO ("la mesial"), no de celdas
  // por vista: hay que proyectar la celda marcada antes de comparar. Es la
  // misma regla que aplica `handleApplyTemplate`, y de ahí sale que la
  // previsualización no pueda mentir: usa el mismo criterio que la escritura.
  const applicable = new Set<CanonicalSurface>(template.applicableSurfaces);
  const affected: ToothSurface[] = [];
  const ignored: ToothSurface[] = [];
  markedSurfaces.forEach((surface) => {
    if (applicable.has(projectToCanonicalSurface(surface))) affected.push(surface);
    else ignored.push(surface);
  });
  return { affected, ignored };
}

/** "M·O y D·O" — enumeración en español, con "y" antes del último. */
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

export function TemplatePicker({
  templates,
  toothNumber,
  markedSurfaces,
  disabled = false,
  previewTemplate,
  onPreviewChange,
  onApply,
  lastApplied,
  onUndo,
}: TemplatePickerProps) {
  const hasMarked = markedSurfaces.length > 0;
  const shortLabel = (surface: ToothSurface) =>
    ToothTypeService.getSurfaceLabel(toothNumber, surface).short;

  const preview = useMemo(() => {
    if (!previewTemplate || !hasMarked) return null;
    const { affected, ignored } = splitByTemplate(
      markedSurfaces,
      previewTemplate,
    );
    return { template: previewTemplate, affected, ignored };
  }, [previewTemplate, markedSurfaces, hasMarked]);

  const affectedSet = useMemo(
    () => new Set(preview?.affected ?? []),
    [preview],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {templates.map((template) => {
          const { affected } = splitByTemplate(markedSurfaces, template);
          // Deshabilitada cuando no escribiría NADA. Antes se podía pulsar y no
          // pasaba nada: la plantilla no aplicaba a ninguna cara marcada y el
          // panel se quedaba callado.
          const canApply = !disabled && hasMarked && affected.length > 0;
          const isPreviewing = previewTemplate?.id === template.id;
          return (
            <button
              key={template.id}
              type="button"
              disabled={!canApply}
              title={template.description}
              onClick={() => onApply(template)}
              onMouseEnter={() => onPreviewChange(template)}
              onMouseLeave={() => onPreviewChange(null)}
              // Foco y cursor abren la MISMA previsualización: con teclado se
              // recorre con Tab y se ve lo mismo que pasando el ratón.
              onFocus={() => onPreviewChange(template)}
              onBlur={() => onPreviewChange(null)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-tight transition-colors",
                isPreviewing
                  ? "border-brand bg-brand/10 text-ink"
                  : "border-hairline bg-elevated text-ink",
                canApply ? "hover:border-brand" : "cursor-not-allowed opacity-45",
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: SURFACE_STATUS_COLORS[template.status] }}
                aria-hidden="true"
              />
              {template.name}
            </button>
          );
        })}
      </div>

      {/* Área de previsualización. Existe SIEMPRE, también en reposo: si
          apareciera solo al pasar por encima, cada hover empujaría el resto del
          panel hacia abajo y el chip se escaparía del cursor. */}
      <div
        aria-live="polite"
        className={cn(
          "rounded-lg border px-2.5 py-2 text-[11px] transition-colors",
          preview
            ? "border-brand/45 bg-brand/5"
            : "border-dashed border-hairline",
        )}
      >
        {!hasMarked && (
          <p className="text-subtle">
            Marca una cara del diente para ver dónde caería cada plantilla.
          </p>
        )}

        {hasMarked && !preview && (
          <p className="text-subtle">
            Pasa por encima de una plantilla para ver sobre qué caras escribiría.
          </p>
        )}

        {preview && (
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-ink">
              {preview.template.name} → {preview.affected.length} de{" "}
              {markedSurfaces.length}{" "}
              {markedSurfaces.length === 1 ? "cara marcada" : "caras marcadas"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {markedSurfaces.map((surface) => {
                const isHit = affectedSet.has(surface);
                return (
                  <span
                    key={surface}
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-tight",
                      isHit ? "text-ink" : "border-hairline text-subtle opacity-45",
                    )}
                    style={
                      isHit
                        ? {
                            borderColor:
                              SURFACE_STATUS_COLORS[preview.template.status],
                            backgroundColor: `${SURFACE_STATUS_COLORS[preview.template.status]}33`,
                          }
                        : undefined
                    }
                  >
                    {shortLabel(surface)}
                  </span>
                );
              })}
            </div>
            {preview.ignored.length > 0 && (
              <p className="text-subtle">
                {joinLabels(preview.ignored.map(shortLabel))}{" "}
                {preview.ignored.length === 1
                  ? "se queda como está"
                  : "se quedan como están"}
                .
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirmación con salida. Aplicar dejaba solo un parpadeo de 600 ms:
          si el odontólogo apartaba la vista, no quedaba ni rastro de qué se
          había escrito ni forma de revertirlo sin rehacerlo a mano. */}
      {lastApplied && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px]">
          <span className="min-w-0 text-ink">
            <span className="font-semibold">{lastApplied.templateName}</span>{" "}
            aplicada a{" "}
            {joinLabels(lastApplied.affected.map(shortLabel))}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand transition-colors hover:text-brand/80"
          >
            <Undo2 className="h-3 w-3" aria-hidden="true" />
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
