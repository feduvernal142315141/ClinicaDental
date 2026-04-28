"use client";

import { OdontogramLegend } from "./odontogramLeyend";
import { ToothSVGMultiView } from "./tooth-svg-multi-view";
import type { Tooth, ToothSurface } from "./types";
import { useOdontogramStore } from "@/lib/odontogram/store";

interface OdontogramGridProps {
  teeth: Tooth[];
  onSurfaceClick: (toothNumber: number, surface: ToothSurface) => void;
  onToothClick: (toothNumber: number) => void;
}

export function OdontogramGrid({
  teeth,
  onSurfaceClick,
  onToothClick,
}: OdontogramGridProps) {
  const clinicalEvents = useOdontogramStore((state) => state.clinicalEvents);

  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];

  const getToothData = (num: number) => {
    const tooth = teeth.find((t) => t.number === num);
    if (!tooth) return undefined;

    const toothEvents = clinicalEvents.filter((e) => e.toothNumber === num);

    const surfaceTreatments = toothEvents
      .filter((e) => e.type === "plan" || e.type === "performed")
      .flatMap((e) =>
        e.surfaces.map((surface) => ({
          id: e.id,
          surface,
          type: e.notes?.split(":")[0] || "Tratamiento",
          category: "restaurador" as const,
          description: e.notes || "",
          status:
            e.type === "performed"
              ? ("completed" as const)
              : ("planned" as const),
          price: `$${e.cost || 0}`,
          date: e.createdAt,
        })),
      );

    const surfaceConditions = toothEvents
      .filter((e) => e.type === "diagnosis")
      .flatMap((e) =>
        e.surfaces.map((surface) => ({
          id: e.id,
          surface,
          condition:
            e.icdasScore && e.icdasScore > 0
              ? ("caries" as const)
              : ("healthy" as const),
          severity: e.severity || ("low" as const),
          notes: e.notes || "",
          diagnosedDate: e.createdAt,
        })),
      );

    return {
      ...tooth,
      surfaceTreatments,
      surfaceConditions,
    };
  };

  const renderToothRow = (
    toothNumbers: number[],
    view: "frontal" | "oclusal" | "lateral",
  ) => {
    // Proportions adapted to the professional SVG designs.
    // - frontal (vestibular): includes roots, so taller
    // - oclusal: nearly square aspect ratio
    // - lateral: moderate height
    const containerClass = {
      frontal: "w-[3.2rem] h-[4.5rem] cursor-pointer hover:opacity-80 transition-opacity",
      oclusal: "w-[3.2rem] h-[3.2rem] cursor-pointer hover:opacity-80 transition-opacity",
      lateral: "w-[3.2rem] h-[4rem] cursor-pointer hover:opacity-80 transition-opacity",
    }[view];

    return (
      <div className="flex gap-0.5">
        {toothNumbers.map((num) => {
          const tooth = getToothData(num);
          return (
            <div
              key={`${num}-${view}`}
              className={containerClass}
              onClick={() => onToothClick(num)}
            >
              <ToothSVGMultiView
                toothNumber={num}
                view={view}
                surfaceTreatments={tooth?.surfaceTreatments || []}
                surfaceConditions={tooth?.surfaceConditions || []}
                onSurfaceClick={(surface) => onSurfaceClick(num, surface)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-muted-foreground mb-4">
          Arcada Superior
        </div>

        {/* Vista Frontal Superior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(upperRight, "frontal")}
          <div className="w-px bg-border" />
          {renderToothRow(upperLeft, "frontal")}
        </div>

        {/* Vista Oclusal Superior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(upperRight, "oclusal")}
          <div className="w-px bg-border" />
          {renderToothRow(upperLeft, "oclusal")}
        </div>

        {/* Vista Lateral Superior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(upperRight, "lateral")}
          <div className="w-px bg-border" />
          {renderToothRow(upperLeft, "lateral")}
        </div>

        {/* Números de dientes */}
        <div className="flex justify-center gap-4 text-xs text-center font-mono">
          <div className="flex gap-0.5">
            {upperRight.map((num) => (
              <div key={num} className="w-12">
                {num}
              </div>
            ))}
          </div>
          <div className="w-px" />
          <div className="flex gap-0.5">
            {upperLeft.map((num) => (
              <div key={num} className="w-12">
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-border my-8" />

      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-muted-foreground mb-4">
          Arcada Inferior
        </div>

        {/* Vista Lateral Inferior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(lowerRight, "lateral")}
          <div className="w-px bg-border" />
          {renderToothRow(lowerLeft, "lateral")}
        </div>

        {/* Vista Oclusal Inferior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(lowerRight, "oclusal")}
          <div className="w-px bg-border" />
          {renderToothRow(lowerLeft, "oclusal")}
        </div>

        {/* Vista Frontal Inferior */}
        <div className="flex justify-center gap-4">
          {renderToothRow(lowerRight, "frontal")}
          <div className="w-px bg-border" />
          {renderToothRow(lowerLeft, "frontal")}
        </div>

        {/* Números de dientes */}
        <div className="flex justify-center gap-4 text-xs text-center font-mono">
          <div className="flex gap-0.5">
            {lowerRight.map((num) => (
              <div key={num} className="w-12">
                {num}
              </div>
            ))}
          </div>
          <div className="w-px" />
          <div className="flex gap-0.5">
            {lowerLeft.map((num) => (
              <div key={num} className="w-12">
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#F5F5DC" }} />
          <span className="text-muted-foreground">Sano</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3B82F6" }} />
          <span className="text-muted-foreground">Obturación</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#EF4444" }} />
          <span className="text-muted-foreground">Endodoncia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#F59E0B" }} />
          <span className="text-muted-foreground">Prótesis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10B981" }} />
          <span className="text-muted-foreground">Periodoncia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#6B7280" }} />
          <span className="text-muted-foreground">Cirugía</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#DC2626" }} />
          <span className="text-muted-foreground">Caries</span>
        </div>
      </div> */}
      <OdontogramLegend />
    </div>
  );
}
