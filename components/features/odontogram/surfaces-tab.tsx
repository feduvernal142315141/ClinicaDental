"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui";
import { ODONTOGRAM_FIELD_LABEL_CLASS } from "@/components/features/odontogram/ui";
import { cn } from "@/lib/odontogram/utils";
import { SurfaceSelector, getSurfaceRank } from "./surface-selector";
import { TemplatePicker, splitByTemplate } from "./template-picker";
import type { AppliedTemplateRecord } from "./template-picker";
import { getDesignedToothPaths } from "./teeth-svg-adapter";
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
  PAINTABLE_SURFACES,
  SURFACE_STATUS_COLORS,
  SURFACE_STATUS_LABELS,
  TOOTH_TEMPLATES,
  getSurfaceZone,
  isLegacySurface,
  projectToCanonicalSurface,
} from "./types";
import { isToothPhysicallyAbsent } from "@/lib/odontogram/domain/odontogram/constants/tooth-status.constants";

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
  const [flashedSurfaces, setFlashedSurfaces] = useState<Set<string>>(
    new Set(),
  );
  /** Plantilla apuntada en el panel: la previsualizan el picker Y el selector. */
  const [previewTemplate, setPreviewTemplate] = useState<ToothTemplate | null>(
    null,
  );
  /** Estado anterior a la última plantilla aplicada, para deshacerla. */
  const [undoSnapshot, setUndoSnapshot] = useState<SurfaceState[] | null>(null);
  const [lastApplied, setLastApplied] = useState<AppliedTemplateRecord | null>(
    null,
  );
  const isInitialized = useRef<number | null>(null);
  const pendingInit = useRef(false);
  const anterior = isAnterior(tooth.number);
  // Una exodoncia INDICADA no bloquea: la pieza sigue en boca y normalmente es
  // justo la que hay que diagnosticar para justificar la extracción.
  // Dos motivos DISTINTOS para no poder marcar caras, y no se pueden mezclar:
  // que la pieza no esté en boca (hecho clínico) o que la ficha sea de solo
  // lectura (permiso o visita cerrada). Colapsarlos hacía que TODO diente
  // abierto sin consulta activa anunciara "marcado como Ausente", que es un
  // dato clínico falso sobre el paciente.
  const isAbsentOrImplant = isToothPhysicallyAbsent(tooth.globalStatus);
  const isDisabled = readOnly || isAbsentOrImplant;

  // Caras que este diente REALMENTE tiene geometría para marcar (unión de las 3
  // vistas). Evita crear estados "fantasma" que nunca se pintan — p.ej. 'lingual'
  // no existe en la vista palatina de anteriores (allí es cervical + incisal).
  const availableSurfaces = useMemo(() => {
    const set = new Set<ToothSurface>();
    (["frontal", "oclusal", "lateral"] as const).forEach((view) => {
      const paths = getDesignedToothPaths(tooth.number, view);
      paths?.surfaces.forEach((sp) => {
        if (sp.d) set.add(sp.surface);
      });
    });
    return set;
  }, [tooth.number]);

  useEffect(() => {
    // Only initialize once per tooth or when tooth changes
    if (isInitialized.current === tooth.number) {
      return;
    }

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
      onSurfacesChange(surfaceNames);
    }
    if (onSurfaceStatesChange) {
      onSurfaceStatesChange(selectedSurfaces);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurfaces, onSurfacesChange]);

  const handleSurfaceToggle = (surface: ToothSurface) => {
    setSelectedSurfaces((prev) => {
      const exists = prev.find((s) => s.surface === surface);
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
    // Siempre PAINTABLE_SURFACES ∩ availableSurfaces: la lista canónica marca
    // QUÉ celdas existen y la geometría del diente cuáles tiene REALMENTE (un
    // 26 no tiene cervical vestibular, un anterior no tiene cervical palatina).
    // Así no se crean estados "fantasma" que nunca se pintan.
    const allSurfaces = PAINTABLE_SURFACES.filter((surface) =>
      availableSurfaces.has(surface),
    );
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
    // Se conserva TODA cara ya seleccionada que la geometría actual no ofrece,
    // no solo los códigos legacy: además de `mesial`/`distal`, un registro
    // antiguo puede vivir en una celda que este diente ya no expone —p. ej.
    // `cervicalLingual` en un incisivo, que sí existía antes del desdoble—.
    // Si se perdiera aquí, la barrida de huérfanos de tooth-modal borraría el
    // diagnóstico al guardar. "Marcar todas" nunca debe destruir registro.
    const preservedStates = selectedSurfaces.filter(
      (s) => !availableSurfaces.has(s.surface),
    );
    setSelectedSurfaces([...preservedStates, ...newStates]);
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
    zoneSurfaces.length > 0 &&
    zoneSurfaces.every((s) => selectedSurfaces.some((ss) => ss.surface === s));

  /**
   * Celdas de una FAMILIA anatómica que este diente tiene de verdad. Es la
   * mitigación del riesgo de infra-documentación: tras el desdoble por vista,
   * una lesión mesial completa son 3 celdas, y sin este atajo el clínico
   * tendería a marcar solo la vista que está mirando y el diente se leería "MO"
   * cuando la lesión era proximal completa. Con esto, una MOD son 3 clics.
   */
  const zoneCells = (zone: ReturnType<typeof getSurfaceZone>): ToothSurface[] =>
    PAINTABLE_SURFACES.filter(
      (surface) =>
        getSurfaceZone(surface) === zone && availableSurfaces.has(surface),
    );

  const canonicalSurfaceCount = new Set(
    selectedSurfaces.map((s) => projectToCanonicalSurface(s.surface)),
  ).size;

  /**
   * Los chips son el RESUMEN de lo seleccionado, no un selector (la selección
   * primaria ocurre sobre las tres vistas del `SurfaceSelector`). Por eso van en
   * orden canónico de lectura odontológica y no en orden de clic: así se leen
   * como un `MOD` de toda la vida aunque sean 13 celdas. Se ordena una COPIA:
   * el estado conserva el orden de inserción, del que depende el resaltado de
   * "última cara interactuada" del selector.
   */
  const orderedSurfaces = useMemo(
    () =>
      [...selectedSurfaces].sort(
        (a, b) => getSurfaceRank(a.surface) - getSurfaceRank(b.surface),
      ),
    [selectedSurfaces],
  );

  const mesialCells = zoneCells("mesial");
  const distalCells = zoneCells("distal");
  const facialCells = zoneCells("facial");
  const lingualCells = zoneCells("lingual");

  const handleApplyTemplate = (template: ToothTemplate) => {
    // Mismo criterio que la previsualización — de hecho, la MISMA función. Si
    // divergieran, el panel enseñaría unas caras y escribiría otras.
    const { affected } = splitByTemplate(markedSurfaces, template);
    if (affected.length === 0) return;
    const affectedSet = new Set(affected);

    // Flash animation: sobre las celdas realmente afectadas, no sobre el
    // vocabulario canónico de la plantilla (que no son códigos de celda).
    setFlashedSurfaces(new Set(affected));
    setTimeout(() => setFlashedSurfaces(new Set()), 600);

    // Foto del ANTES para poder deshacer. Se guarda el array entero, no solo
    // las celdas tocadas: restaurar por partes dejaría fuera el orden de
    // inserción, del que depende el resaltado de "última cara interactuada".
    setUndoSnapshot(selectedSurfaces);
    setLastApplied({ templateName: template.name, affected });

    setSelectedSurfaces((prev) =>
      prev.map((surface) =>
        affectedSet.has(surface.surface)
          ? {
              ...surface,
              status: template.status,
              icdasScore: template.icdasScore,
              treatmentType: template.treatmentType,
              color: template.color,
              lastUpdate: new Date().toISOString(),
            }
          : surface,
      ),
    );
  };

  const handleUndoTemplate = () => {
    if (!undoSnapshot) return;
    setSelectedSurfaces(undoSnapshot);
    setUndoSnapshot(null);
    setLastApplied(null);
  };

  // Catálogo aplicable a ESTA pieza, entero. Ya no se recorta: antes había un
  // `slice(0, 8)` para que cuadrara la rejilla de 2 columnas, y con él la
  // novena plantilla que se añadiera habría desaparecido de la pantalla SIN dar
  // ningún error. La búsqueda de `TemplateSearch` es la que ahora acota, y esa
  // sí dice cuántas hay y cuántas coinciden.
  const relevantTemplates = useMemo<ToothTemplate[]>(
    () =>
      TOOTH_TEMPLATES.filter((t) =>
        anterior
          ? t.id !== "sealant-o" && t.id !== "amalgam-o"
          : t.id !== "caries-incisal" && t.id !== "veneer",
      ),
    [anterior],
  );

  const markedSurfaces = useMemo(
    () => selectedSurfaces.map((s) => s.surface),
    [selectedSurfaces],
  );

  // El dibujo del diente y el panel de plantillas enseñan la MISMA jugada: qué
  // celdas escribiría la plantilla apuntada y cuáles dejaría intactas.
  const templatePreview = useMemo(() => {
    if (!previewTemplate || markedSurfaces.length === 0) return null;
    const { affected, ignored } = splitByTemplate(
      markedSurfaces,
      previewTemplate,
    );
    if (affected.length === 0) return null;
    return {
      affected: new Set(affected),
      ignored: new Set(ignored),
      color: SURFACE_STATUS_COLORS[previewTemplate.status],
    };
  }, [previewTemplate, markedSurfaces]);

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
            <HoverCard openDelay={150}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  aria-label="Ver escala de colores"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent align="end" className="w-auto p-3">
                <h4 className="mb-2 text-xs font-semibold text-ink">
                  Escala de colores
                </h4>
                {legendContent}
              </HoverCardContent>
            </HoverCard>
            <span className="text-xs font-medium text-muted-foreground">
              Superficies
            </span>
            {/* Contador PROYECTADO a superficies canónicas ADA: una MOD son 3
                superficies aunque se hayan marcado 5 celdas. Contar celdas haría
                que el número dejara de servir para reportar o facturar. El
                granular vive en el título. */}
            <span
              className="text-lg font-bold leading-none text-ink tabular-nums"
              title={`${selectedSurfaces.length} celda${
                selectedSurfaces.length === 1 ? "" : "s"
              } marcada${selectedSurfaces.length === 1 ? "" : "s"}`}
            >
              {canonicalSurfaceCount}
            </span>
          </div>
        </div>
      </div>

      {/* Texto informativo PERMANENTE: cuando la pieza no está en boca, este
          aviso ya está en pantalla al abrir el diente y solo explica por qué
          las caras no se pueden marcar. Por eso `live={false}` (role="note"):
          no es un anuncio que deba interrumpir al lector de pantalla. */}
      {isAbsentOrImplant && (
        <Alert variant="warning" live={false}>
          <AlertDescription>
            ⚠️ Las superficies están deshabilitadas porque el diente está
            marcado como{" "}
            {tooth.globalStatus === "implant" ? "Implante" : "Ausente"}.
          </AlertDescription>
        </Alert>
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
            preview={templatePreview}
          />
        </Card>

        {/* Right column: Compact panel */}
        <div className="space-y-3">
          {/* Selection chips */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className={ODONTOGRAM_FIELD_LABEL_CLASS}>
                Selección actual
              </span>
            </div>
            {selectedSurfaces.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                Ninguna superficie seleccionada
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {orderedSurfaces.map((surface) => (
                  <Badge
                    key={surface.surface}
                    title={
                      ToothTypeService.getSurfaceLabel(
                        tooth.number,
                        surface.surface,
                      ).full
                    }
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
                    ).short}
                    {/* Un código de registro anterior no se disfraza de dato
                        preciso: se dice que no quedó registrada la vista. No hay
                        casilla para marcarlo, pero SE SIGUE MOSTRANDO — si el
                        chip desapareciera, el primer guardado del diente
                        borraría el diagnóstico histórico. */}
                    {isLegacySurface(surface.surface) && (
                      <span className="opacity-80"> (sin vista)</span>
                    )}{" "}
                    ·{" "}
                    {/* Una cara restaurada dice QUÉ tiene, no la etiqueta
                        genérica: "Realizado/Existente" no distingue el trabajo
                        hecho aquí del que ya venía puesto. Con el material, el
                        chip se lee "O · Obturación previa (Resina)". */}
                    {surface.status === "pathology" &&
                    (surface.icdasScore ?? 0) > 0
                      ? `ICDAS ${surface.icdasScore}`
                      : surface.status === "completed" && surface.treatmentType
                        ? surface.treatmentType
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

          {/* Plantillas — bloque PRIMARIO del panel, y por eso va aquí arriba.
              Antes cerraba la columna, debajo de los siete botones de "Atajos
              secundarios", así que el camino RÁPIDO quedaba enterrado bajo el
              lento y fuera de la vista sin hacer scroll. Su sitio es justo bajo
              "Selección actual" porque depende de ella: sin caras marcadas los
              botones están deshabilitados. */}
          <Card className="border-brand/40 bg-brand/5 p-3 ring-1 ring-brand/20">
            <div className="mb-1 flex items-center justify-between gap-2">
              {/* Título de sección de verdad, no la etiqueta de campo: con
                  ODONTOGRAM_FIELD_LABEL_CLASS pesaba lo mismo que "Zonas
                  derivadas", que es un SUBtítulo dentro de otra tarjeta. */}
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-ink">
                <Zap className="h-4 w-4 shrink-0 text-brand" />
                Plantillas
              </span>
              {selectedSurfaces.length > 0 && !isDisabled && (
                <nav
                  aria-label="Navegación rápida"
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
            {/* Al subir el bloque, con 0 caras marcadas lo primero que se ve es
                una rejilla apagada. La línea dice POR QUÉ está apagada en vez de
                dejar al usuario adivinando. */}
            <p className="mb-3 text-xs leading-5 text-subtle">
              {selectedSurfaces.length === 0
                ? "Marca al menos una cara para aplicar una plantilla."
                : "Aplica un diagnóstico o tratamiento a las caras marcadas."}
            </p>
            <TemplatePicker
              templates={relevantTemplates}
              toothNumber={tooth.number}
              markedSurfaces={markedSurfaces}
              disabled={isDisabled}
              previewTemplate={previewTemplate}
              onPreviewChange={setPreviewTemplate}
              onApply={handleApplyTemplate}
              lastApplied={lastApplied}
              onUndo={handleUndoTemplate}
            />
          </Card>

          {/* Quick actions - grouped */}
          <Card className="p-3">
            <span className={cn(ODONTOGRAM_FIELD_LABEL_CLASS, "mb-2 block")}>
              Atajos secundarios
            </span>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              La selección principal ocurre sobre las tres vistas del diente.
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
              <p className={ODONTOGRAM_FIELD_LABEL_CLASS}>Zonas derivadas</p>
              {/* Atajos por FAMILIA anatómica: marcan de una vez las celdas de
                  esa cara en las tres vistas (las que este diente tenga). */}
              {mesialCells.length > 0 && (
                <Button
                  variant={isZoneSelected(mesialCells) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(mesialCells)}
                  disabled={isDisabled}
                >
                  Mesial completa
                </Button>
              )}
              {distalCells.length > 0 && (
                <Button
                  variant={isZoneSelected(distalCells) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(distalCells)}
                  disabled={isDisabled}
                >
                  Distal completa
                </Button>
              )}
              <Button
                variant={
                  isZoneSelected([...mesialCells, ...distalCells])
                    ? "default"
                    : "outline"
                }
                size="sm"
                className="w-full text-xs h-8 bg-transparent"
                onClick={() =>
                  handleToggleZone([...mesialCells, ...distalCells])
                }
                disabled={isDisabled}
              >
                <Columns2 className="w-3 h-3 mr-1" />
                Proximales (M+D)
              </Button>
              {facialCells.length > 0 && (
                <Button
                  variant={isZoneSelected(facialCells) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(facialCells)}
                  disabled={isDisabled}
                >
                  {/* "completa" NO es decorativo: como sus hermanos Mesial y
                      Distal, este atajo marca la cara en TODAS las vistas que
                      el diente tenga. En un posterior eso incluye la vertiente
                      bucal de la mesa oclusal, así que el botón etiquetado solo
                      "Vestibular" pintaba también el cuadro Oclusal y parecía
                      que la marca se cruzaba de cara. Marcar una superficie que
                      no se ha explorado es una afirmación clínica falsa: el
                      atajo tiene que anunciar su alcance. */}
                  {ToothTypeService.getSurfaceLabel(tooth.number, "facial").full}{" "}
                  completa
                </Button>
              )}
              {lingualCells.length > 0 && (
                <Button
                  variant={isZoneSelected(lingualCells) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(lingualCells)}
                  disabled={isDisabled}
                >
                  {ToothTypeService.getSurfaceLabel(tooth.number, "lingual").full}
                </Button>
              )}
              {availableSurfaces.has("cervicalVestibular") && (
                <Button
                  variant={
                    isZoneSelected(["cervicalVestibular"]) ? "default" : "outline"
                  }
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(["cervicalVestibular"])}
                  disabled={isDisabled}
                >
                  {
                    ToothTypeService.getSurfaceLabel(
                      tooth.number,
                      "cervicalVestibular",
                    ).full
                  }
                </Button>
              )}
              {availableSurfaces.has("cervicalLingual") && (
                <Button
                  variant={
                    isZoneSelected(["cervicalLingual"]) ? "default" : "outline"
                  }
                  size="sm"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => handleToggleZone(["cervicalLingual"])}
                  disabled={isDisabled}
                >
                  {
                    ToothTypeService.getSurfaceLabel(
                      tooth.number,
                      "cervicalLingual",
                    ).full
                  }
                </Button>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
