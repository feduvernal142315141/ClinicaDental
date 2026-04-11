"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SurfaceSelector } from "./surface-selector";
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
  onNavigateToTab,
  onSurfacesChange,
  onSurfaceStatesChange,
}: SurfacesTabProps) {
  const [selectedSurfaces, setSelectedSurfaces] = useState<SurfaceState[]>([]);
  const [lastUsedTemplate, setLastUsedTemplate] = useState<string | null>(null);
  const isInitialized = useRef<number | null>(null);
  const pendingInit = useRef(false);
  const anterior = isAnterior(tooth.number);
  const isDisabled =
    tooth.globalStatus === "absent" || tooth.globalStatus === "implant";

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

  const handleToggleProximal = () => {
    const hasProximal = selectedSurfaces.some(
      (s) => s.surface === "mesial" || s.surface === "distal",
    );
    if (hasProximal) {
      setSelectedSurfaces((prev) =>
        prev.filter((s) => s.surface !== "mesial" && s.surface !== "distal"),
      );
    } else {
      const mesial: SurfaceState = {
        surface: "mesial",
        status: "healthy",
        icdasScore: 0,
        color: SURFACE_STATUS_COLORS.healthy,
        lastUpdate: new Date().toISOString(),
      };
      const distal: SurfaceState = {
        surface: "distal",
        status: "healthy",
        icdasScore: 0,
        color: SURFACE_STATUS_COLORS.healthy,
        lastUpdate: new Date().toISOString(),
      };
      setSelectedSurfaces((prev) => [
        ...prev.filter((s) => s.surface !== "mesial" && s.surface !== "distal"),
        mesial,
        distal,
      ]);
    }
  };

  const handleToggleVestibular = () => {
    const hasFacial = selectedSurfaces.some((s) => s.surface === "facial");
    if (hasFacial) {
      setSelectedSurfaces((prev) => prev.filter((s) => s.surface !== "facial"));
    } else {
      const facial: SurfaceState = {
        surface: "facial",
        status: "healthy",
        icdasScore: 0,
        color: SURFACE_STATUS_COLORS.healthy,
        lastUpdate: new Date().toISOString(),
      };
      setSelectedSurfaces((prev) => [
        ...prev.filter((s) => s.surface !== "facial"),
        facial,
      ]);
    }
  };

  const handleToggleLingual = () => {
    const hasLingual = selectedSurfaces.some((s) => s.surface === "lingual");
    if (hasLingual) {
      setSelectedSurfaces((prev) =>
        prev.filter((s) => s.surface !== "lingual"),
      );
    } else {
      const lingual: SurfaceState = {
        surface: "lingual",
        status: "healthy",
        icdasScore: 0,
        color: SURFACE_STATUS_COLORS.healthy,
        lastUpdate: new Date().toISOString(),
      };
      setSelectedSurfaces((prev) => [
        ...prev.filter((s) => s.surface !== "lingual"),
        lingual,
      ]);
    }
  };

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

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Diente {tooth.number}</h3>
          <p className="text-sm text-muted-foreground">
            {anterior ? "Anterior" : "Posterior"} ·{" "}
            {getQuadrantName(tooth.number)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground">
            Superficies
          </p>
          <p className="text-2xl font-bold">{selectedSurfaces.length}</p>
        </div>
      </div>

      {isDisabled && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            ⚠️ Las superficies están deshabilitadas porque el diente está
            marcado como{" "}
            {tooth.globalStatus === "absent" ? "Ausente" : "Implante"}.
          </p>
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium mr-2">Selección actual:</span>
          {selectedSurfaces.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Ninguna superficie seleccionada
            </span>
          ) : (
            selectedSurfaces.map((surface) => (
              <Badge
                key={surface.surface}
                className="text-xs px-2 py-1"
                style={{
                  backgroundColor: surface.color,
                  color: "white",
                }}
              >
                {surface.surface.charAt(0).toUpperCase()} ·{" "}
                {SURFACE_STATUS_LABELS[surface.status]}
              </Badge>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <Card className="p-4 flex items-center justify-center">
          <SurfaceSelector
            toothNumber={tooth.number}
            surfaces={selectedSurfaces}
            onSurfaceToggle={handleSurfaceToggle}
            disabled={isDisabled}
          />
        </Card>

        <Card className="p-4 flex flex-col">
          <h4 className="font-semibold text-sm mb-3">Acciones rápidas</h4>
          <div className="space-y-2 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isDisabled}
              >
                Marcar todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={isDisabled}
              >
                Desmarcar
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={handleToggleProximal}
              disabled={isDisabled}
            >
              Proximales (M+D)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={handleToggleVestibular}
              disabled={isDisabled}
            >
              {anterior ? "Labial" : "Vestibular"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={handleToggleLingual}
              disabled={isDisabled}
            >
              {anterior ? "Palatino" : "Lingual"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Plantillas sugeridas</h4>
          {selectedSurfaces.length > 0 && !isDisabled && (
            <div className="flex gap-2">
              <Button
                variant="link"
                size="sm"
                className="text-xs h-auto p-0"
                onClick={() => onNavigateToTab?.("diagnostico")}
              >
                → Ir a Diagnóstico
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-xs h-auto p-0"
                onClick={() => onNavigateToTab?.("plan")}
              >
                → Ir a Plan
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {getRelevantTemplates().map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              className="justify-start text-left h-auto py-2 bg-transparent"
              onClick={() => handleApplyTemplate(template)}
              disabled={isDisabled || selectedSurfaces.length === 0}
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: template.color }}
                />
                <span className="text-xs truncate">{template.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-3 bg-muted/30">
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {Object.entries(SURFACE_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor:
                    SURFACE_STATUS_COLORS[status as SurfaceStatus],
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
