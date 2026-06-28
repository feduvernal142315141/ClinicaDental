"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover } from "antd";
import { SurfaceSelector } from "./surface-selector";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";
import {
  X,
  CheckSquare,
  Square,
  Columns2,
  HelpCircle,
  Zap,
} from "lucide-react";
import type {
  Tooth,
  ToothSurface,
  SurfaceState,
  ToothTemplate,
  SurfaceStatus,
} from "./types";
import {
  SURFACE_STATUS_COLORS,
  SURFACE_STATUS_LABELS,
  TOOTH_TEMPLATES,
} from "./types";

interface SurfacesTabProps {
  tooth: Tooth;
  initialSurfaces?: ToothSurface[];
  initialSurfaceStates?: SurfaceState[];
  /** Modo solo-lectura (sin consulta activa / visita finalizada / sin permiso). */
  readOnly?: boolean;
  onNavigateToTab?: (tab: string) => void;
  onSurfacesChange?: (surfaces: ToothSurface[]) => void;
  onSurfaceStatesChange?: (states: SurfaceState[]) => void;
}

function isAnterior(toothNumber: number): boolean {
  const position = toothNumber % 10;
  return position >= 1 && position <= 3;
}

function getQuadrantName(toothNumber: number): string {
  const quadrant = Math.floor(toothNumber / 10);
  if (quadrant === 1) return "Superior derecho";
  if (quadrant === 2) return "Superior izquierdo";
  if (quadrant === 3) return "Inferior izquierdo";
  if (quadrant === 4) return "Inferior derecho";
  return "";
}

export function SurfacesTab({
  tooth,
  initialSurfaces = [],
  initialSurfaceStates,
  readOnly = false,
  onNavigateToTab,
  onSurfacesChange,
  onSurfaceStatesChange,
}: SurfacesTabProps) {
  const [selectedSurfaces, setSelectedSurfaces] = useState<SurfaceState[]>([]);
  const [lastUsedTemplate, setLastUsedTemplate] = useState<string | null>(null);
  const [flashedSurfaces, setFlashedSurfaces] = useState<Set<string>>(
    new Set(),
  );
  const isInitialized = useRef<number | null>(null);
  const pendingInit = useRef(false);
  const anterior = isAnterior(tooth.number);
  const isDisabled =
    readOnly ||
    tooth.globalStatus === "absent" ||
    tooth.globalStatus === "implant";

  useEffect(() => {
    // Only initialize once per tooth or when tooth changes
    if (isInitialized.current === tooth.number) {
      console.log(
        `[SurfacesTab] ⏭️ Skip init diente ${tooth.number} (ya inicializado)`,
      );
      return;
    }

    console.group(`[SurfacesTab] 🔄 INIT diente ${tooth.number}`);
    console.log("initialSurfaces recibidas:", initialSurfaces);
    console.log(
      "tooth.surfaceTreatments:",
      JSON.parse(JSON.stringify(tooth.surfaceTreatments)),
    );
    console.log(
      "tooth.surfaceConditions:",
      JSON.parse(JSON.stringify(tooth.surfaceConditions)),
    );

    // Usar initialSurfaceStates del padre (computadas desde clinicalEvents) si están disponibles
    let initialStates: SurfaceState[];

    if (initialSurfaceStates && initialSurfaceStates.length > 0) {
      initialStates = initialSurfaceStates;
    } else {
      initialStates = initialSurfaces.map((surface) => ({
        surface,
        status: "healthy" as SurfaceStatus,
        icdasScore: 0,
        color: SURFACE_STATUS_COLORS.healthy,
        lastUpdate: new Date().toISOString(),
      }));
    }

    console.log(
      "initialStates calculados:",
      JSON.parse(JSON.stringify(initialStates)),
    );
    console.groupEnd();

    setSelectedSurfaces(initialStates);
    isInitialized.current = tooth.number;
    pendingInit.current = true;

    // Re-arm pendingInit on cleanup so React 18 StrictMode double-mount
    // doesn't propagate stale empty state to the parent.
    return () => {
      pendingInit.current = true;
    };
  }, [
    tooth.number,
    initialSurfaces,
    initialSurfaceStates,
    tooth.surfaceTreatments,
    tooth.surfaceConditions,
  ]);

  useEffect(() => {
    // Skip stale propagation right after init (state hasn't caught up yet)
    if (pendingInit.current) {
      pendingInit.current = false;
      return;
    }
    if (onSurfacesChange) {
      const surfaceNames = selectedSurfaces.map((s) => s.surface);
      console.log(
        `[SurfacesTab] 📤 Propagando superficies al padre:`,
        surfaceNames,
        "con estados:",
        selectedSurfaces.map((s) => ({
          surface: s.surface,
          status: s.status,
          color: s.color,
        })),
      );
      onSurfacesChange(surfaceNames);
    }
    if (onSurfaceStatesChange) {
      onSurfaceStatesChange(selectedSurfaces);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurfaces, onSurfacesChange]);

  const handleSurfaceToggle = (surface: ToothSurface) => {
    console.log(`[SurfacesTab] 🖱️ Toggle superficie: ${surface}`);
    setSelectedSurfaces((prev) => {
      const exists = prev.find((s) => s.surface === surface);
      console.log(
        `[SurfacesTab]   existe=${!!exists}, prev=`,
        prev.map((s) => s.surface),
      );
      if (exists) {
        return prev.filter((s) => s.surface !== surface);
      } else {
        return [
          ...prev,
          {
            surface,
            status: "healthy" as SurfaceStatus,
            icdasScore: 0,
            color: SURFACE_STATUS_COLORS.healthy,
            lastUpdate: new Date().toISOString(),
          },
        ];
      }
    });
  };

  const handleRemoveSurface = (surface: ToothSurface) => {
    setSelectedSurfaces((prev) => prev.filter((s) => s.surface !== surface));
  };

  const handleSelectAll = () => {
    const allSurfaces: ToothSurface[] = [
      "mesial",
      "distal",
      "facial",
      "lingual",
      "oclusal",
    ];
    const newStates: SurfaceState[] = allSurfaces.map((surface) => {
      const existing = selectedSurfaces.find((s) => s.surface === surface);
      return (
        existing || {
          surface,
          status: "healthy",
          icdasScore: 0,
          color: SURFACE_STATUS_COLORS.healthy,
          lastUpdate: new Date().toISOString(),
        }
      );
    });
    setSelectedSurfaces(newStates);
  };

  const handleDeselectAll = () => {
    setSelectedSurfaces([]);
  };

  /** Toggle a zone group (fills or clears based on current state) */
  const handleToggleZone = (zoneSurfaces: ToothSurface[]) => {
    const allSelected = zoneSurfaces.every((s) =>
      selectedSurfaces.some((ss) => ss.surface === s),
    );
    if (allSelected) {
      setSelectedSurfaces((prev) =>
        prev.filter((s) => !zoneSurfaces.includes(s.surface)),
      );
    } else {
      setSelectedSurfaces((prev) => {
        const existing = new Set(prev.map((s) => s.surface));
        const toAdd = zoneSurfaces
          .filter((s) => !existing.has(s))
          .map(
            (surface) =>
              ({
                surface,
                status: "healthy" as SurfaceStatus,
                icdasScore: 0,
                color: SURFACE_STATUS_COLORS.healthy,
                lastUpdate: new Date().toISOString(),
              }) as SurfaceState,
          );
        return [...prev, ...toAdd];
      });
    }
  };

  /** Check if a zone group is fully selected */
  const isZoneSelected = (zoneSurfaces: ToothSurface[]): boolean =>
    zoneSurfaces.every((s) => selectedSurfaces.some((ss) => ss.surface === s));

  const handleApplyTemplate = (template: ToothTemplate) => {
    console.group(`[SurfacesTab] 🎨 Aplicando plantilla: ${template.name}`);
    console.log("template:", {
      id: template.id,
      status: template.status,
      color: template.color,
      applicableSurfaces: template.applicableSurfaces,
    });
    console.log(
      "selectedSurfaces ANTES:",
      selectedSurfaces.map((s) => ({
        surface: s.surface,
        status: s.status,
        color: s.color,
      })),
    );

    // Flash animation
    setFlashedSurfaces(new Set(template.applicableSurfaces));
    setTimeout(() => setFlashedSurfaces(new Set()), 600);

    setSelectedSurfaces((prev) => {
      const next = prev.map((surface) => {
        if (template.applicableSurfaces.includes(surface.surface)) {
          return {
            ...surface,
            status: template.status,
            icdasScore: template.icdasScore,
            treatmentType: template.treatmentType,
            color: template.color,
            lastUpdate: new Date().toISOString(),
          };
        }
        return surface;
      });
      console.log(
        "selectedSurfaces DESPUÉS:",
        next.map((s) => ({
          surface: s.surface,
          status: s.status,
          color: s.color,
        })),
      );
      console.groupEnd();
      return next;
    });
    setLastUsedTemplate(template.id);
  };

  const getRelevantTemplates = (): ToothTemplate[] => {
    let templates = [...TOOTH_TEMPLATES];

    if (anterior) {
      templates = templates.filter(
        (t) => t.id !== "sealant-o" && t.id !== "amalgam-o",
      );
    } else {
      templates = templates.filter(
        (t) => t.id !== "caries-incisal" && t.id !== "veneer",
      );
    }

    if (lastUsedTemplate) {
      templates.sort((a, b) => {
        if (a.id === lastUsedTemplate) return -1;
        if (b.id === lastUsedTemplate) return 1;
        return 0;
      });
    }

    return templates.slice(0, 6);
  };

  // Legend popover content
  const legendContent = (
    <div className="grid grid-cols-1 gap-1.5 p-1">
      {Object.entries(SURFACE_STATUS_LABELS).map(([status, label]) => (
        <div key={status} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{
              backgroundColor: SURFACE_STATUS_COLORS[status as SurfaceStatus],
            }}
          />
          <span className="text-xs">{label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3 h-full">
      {/* Compact header with tooth info + surface count */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold leading-tight">
            Diente {tooth.number}
          </h3>
          <p className="text-xs text-muted-foreground">
            {anterior ? "Anterior" : "Posterior"} ·{" "}
            {getQuadrantName(tooth.number)}
          </p>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-elevated px-3 py-1.5 shadow-sm">
            <Popover
              content={legendContent}
              title="Escala de colores"
              placement="bottomRight"
              trigger="hover"
            >
              <button
                type="button"
                aria-label="Ver escala de colores"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </Popover>
            <span className="text-xs font-medium text-muted-foreground">
              Superficies
            </span>
            <span className="text-lg font-bold leading-none text-ink tabular-nums">
              {selectedSurfaces.length}
            </span>
          </div>
        </div>
      </div>

      {isDisabled && (
        <Card className="p-3 bg-amber-500/15 border-amber-400/25">
          <p className="text-sm text-amber-600 dark:text-amber-300">
            ⚠️ Las superficies están deshabilitadas porque el diente está
            marcado como{" "}
            {tooth.globalStatus === "absent" ? "Ausente" : "Implante"}.
          </p>
        </Card>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Left column: selector multi-vista */}
        <Card className="p-4 lg:p-5">
          <SurfaceSelector
            toothNumber={tooth.number}
            surfaces={selectedSurfaces}
            onSurfaceToggle={handleSurfaceToggle}
            disabled={isDisabled}
          />
        </Card>

        {/* Right column: Compact panel */}
        <div className="space-y-3">
          {/* Selection chips */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selección actual
              </span>
            </div>
            {selectedSurfaces.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                Ninguna superficie seleccionada
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedSurfaces.map((surface) => (
                  <Badge
                    key={surface.surface}
                    className="text-xs px-2 py-0.5 inline-flex items-center gap-1 transition-all"
                    style={{
                      backgroundColor: surface.color,
                      color: "white",
                      ...(flashedSurfaces.has(surface.surface)
                        ? {
                            transform: "scale(1.15)",
                            boxShadow: `0 0 8px ${surface.color}`,
                          }
                        : {}),
                    }}
                  >
                    {ToothTypeService.getSurfaceLabel(
                      tooth.number,
                      surface.surface,
                    ).short}{" "}
                    ·{" "}
                    {surface.status === "pathology" &&
                    (surface.icdasScore ?? 0) > 0
                      ? `ICDAS ${surface.icdasScore}`
                      : SURFACE_STATUS_LABELS[surface.status]}
                    {!isDisabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSurface(surface.surface);
                        }}
                        className="ml-0.5 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Quick actions - grouped */}
          <Card className="p-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Atajos secundarios
            </span>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              La seleccion principal ocurre sobre las tres vistas del diente.
              Usa estos atajos solo para acelerar acciones repetidas.
            </p>

            {/* Mass selection */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 bg-transparent"
                onClick={handleSelectAll}
                disabled={isDisabled}
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 bg-transparent"
                onClick={handleDeselectAll}
                disabled={isDisabled}
              >
                <Square className="w-3 h-3 mr-1" />
                Desmarcar
              </Button>
            </div>

            {/* Zone selection */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Zonas derivadas
              </p>
              <Button
                variant={
                  isZoneSelected(["mesial", "distal"]) ? "default" : "outline"
                }
                size="sm"
                className="w-full text-xs h-8 bg-transparent"
                onClick={() => handleToggleZone(["mesial", "distal"])}
                disabled={isDisabled}
              >
                <Columns2 className="w-3 h-3 mr-1" />
                Proximales (M+D)
              </Button>
              <Button
                variant={isZoneSelected(["facial"]) ? "default" : "outline"}
                size="sm"
                className="w-full text-xs h-8 bg-transparent"
                onClick={() => handleToggleZone(["facial"])}
                disabled={isDisabled}
              >
                {ToothTypeService.getSurfaceLabel(tooth.number, "facial").full}
              </Button>
              <Button
                variant={isZoneSelected(["lingual"]) ? "default" : "outline"}
                size="sm"
                className="w-full text-xs h-8 bg-transparent"
                onClick={() => handleToggleZone(["lingual"])}
                disabled={isDisabled}
              >
                {ToothTypeService.getSurfaceLabel(tooth.number, "lingual").full}
              </Button>
            </div>
          </Card>

          {/* Templates - always visible */}
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                Plantillas
              </span>
              {selectedSurfaces.length > 0 && !isDisabled && (
                <nav
                  aria-label="Navegacion rapida"
                  className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs"
                >
                  <button
                    type="button"
                    className="font-medium leading-none text-primary transition-colors hover:text-primary/80"
                    onClick={() => onNavigateToTab?.("diagnostico")}
                  >
                    Diagnóstico
                  </button>
                  <span aria-hidden="true" className="text-subtle">
                    /
                  </span>
                  <button
                    type="button"
                    className="font-medium leading-none text-primary transition-colors hover:text-primary/80"
                    onClick={() => onNavigateToTab?.("plan")}
                  >
                    Plan
                  </button>
                </nav>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {getRelevantTemplates().map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-1.5 px-2 bg-transparent"
                  onClick={() => handleApplyTemplate(template)}
                  disabled={isDisabled || selectedSurfaces.length === 0}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="text-xs truncate">{template.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
