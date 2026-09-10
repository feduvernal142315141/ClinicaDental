"use client";

import { OdontogramLegend } from "./odontogramLeyend";
import { QUADRANT_ROWS } from "./chart-constants";
import { ToothSVGMultiView } from "./tooth-svg-multi-view";
import { ResponsiveOdontogramWrapper } from "./responsive-odontogram-wrapper";
import type { Tooth } from "./types";
import { useOdontogramStore } from "@/lib/odontogram/store";
import { ToothNotationLabel } from "@/lib/odontogram/notation";

interface OdontogramGridProps {
  teeth: Tooth[];
  /** El clic abre el modal de la pieza. La grilla NO selecciona caras: las
   *  superficies se marcan dentro del modal. */
  onToothClick: (toothNumber: number) => void;
}

export function OdontogramGrid({ onToothClick }: OdontogramGridProps) {
  const { upperRight, upperLeft, lowerLeft, lowerRight } = QUADRANT_ROWS;
  const notation = useOdontogramStore((state) => state.notation);

  const renderNumberRow = (fdiNumbers: readonly number[]) => (
    <div className="flex gap-0.5">
      {fdiNumbers.map((fdi) => (
        <div key={fdi} className="w-[3.2rem] text-center">
          <ToothNotationLabel fdi={fdi} notation={notation} prefix="Diente" />
        </div>
      ))}
    </div>
  );

  const renderToothRow = (
    toothNumbers: readonly number[],
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
        {toothNumbers.map((num) => (
          <div
            key={`${num}-${view}`}
            className={containerClass}
            onClick={() => onToothClick(num)}
          >
            <ToothSVGMultiView toothNumber={num} view={view} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full flex-1 min-h-0">
      <ResponsiveOdontogramWrapper overlay={<OdontogramLegend />}>
        {/* Ancho intrínseco: el lienzo mide este bloque, no se asume en píxeles */}
        <div className="flex w-max flex-col px-1 py-1">
          {/* Arcada Superior */}
          <div className="space-y-1.5">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Arcada Superior
            </div>

            {/* Vista Frontal Superior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(upperRight, "frontal")}
              <div className="w-px bg-border" />
              {renderToothRow(upperLeft, "frontal")}
            </div>

            {/* Vista Oclusal Superior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(upperRight, "oclusal")}
              <div className="w-px bg-border" />
              {renderToothRow(upperLeft, "oclusal")}
            </div>

            {/* Vista Lateral Superior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(upperRight, "lateral")}
              <div className="w-px bg-border" />
              {renderToothRow(upperLeft, "lateral")}
            </div>

            {/* Números de dientes */}
            <div className="flex justify-center gap-3 text-xs text-center font-mono text-muted-foreground">
              {renderNumberRow(upperRight)}
              <div className="w-px" />
              {renderNumberRow(upperLeft)}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-border my-3" />

          {/* Arcada Inferior */}
          <div className="space-y-1.5">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Arcada Inferior
            </div>

            {/* Vista Lateral Inferior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(lowerRight, "lateral")}
              <div className="w-px bg-border" />
              {renderToothRow(lowerLeft, "lateral")}
            </div>

            {/* Vista Oclusal Inferior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(lowerRight, "oclusal")}
              <div className="w-px bg-border" />
              {renderToothRow(lowerLeft, "oclusal")}
            </div>

            {/* Vista Frontal Inferior */}
            <div className="flex justify-center gap-3">
              {renderToothRow(lowerRight, "frontal")}
              <div className="w-px bg-border" />
              {renderToothRow(lowerLeft, "frontal")}
            </div>

            {/* Números de dientes */}
            <div className="flex justify-center gap-3 text-xs text-center font-mono text-muted-foreground">
              {renderNumberRow(lowerRight)}
              <div className="w-px" />
              {renderNumberRow(lowerLeft)}
            </div>
          </div>
        </div>
      </ResponsiveOdontogramWrapper>
    </div>
  );
}
