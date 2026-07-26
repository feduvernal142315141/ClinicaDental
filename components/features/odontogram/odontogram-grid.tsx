"use client";

import { OdontogramLegend } from "./odontogramLeyend";
import { ToothSVGMultiView } from "./tooth-svg-multi-view";
import { ResponsiveOdontogramWrapper } from "./responsive-odontogram-wrapper";
import type { Tooth, ToothSurface } from "./types";

interface OdontogramGridProps {
  teeth: Tooth[];
  onSurfaceClick: (toothNumber: number, surface: ToothSurface) => void;
  onToothClick: (toothNumber: number) => void;
}

export function OdontogramGrid({
  onSurfaceClick,
  onToothClick,
}: OdontogramGridProps) {
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];

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
        {toothNumbers.map((num) => (
          <div
            key={`${num}-${view}`}
            className={containerClass}
            onClick={() => onToothClick(num)}
          >
            <ToothSVGMultiView
              toothNumber={num}
              view={view}
              onSurfaceClick={(surface) => onSurfaceClick(num, surface)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full flex-1 min-h-0">
      <ResponsiveOdontogramWrapper
        baseWidth={872}
        baseHeight={520}
        floatingOverlay={<OdontogramLegend />}
      >
        <div className="w-[872px] mx-auto flex flex-col justify-between h-full py-1">
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
              <div className="flex gap-0.5">
                {upperRight.map((num) => (
                  <div key={num} className="w-[3.2rem] text-center">
                    {num}
                  </div>
                ))}
              </div>
              <div className="w-px" />
              <div className="flex gap-0.5">
                {upperLeft.map((num) => (
                  <div key={num} className="w-[3.2rem] text-center">
                    {num}
                  </div>
                ))}
              </div>
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
              <div className="flex gap-0.5">
                {lowerRight.map((num) => (
                  <div key={num} className="w-[3.2rem] text-center">
                    {num}
                  </div>
                ))}
              </div>
              <div className="w-px" />
              <div className="flex gap-0.5">
                {lowerLeft.map((num) => (
                  <div key={num} className="w-[3.2rem] text-center">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveOdontogramWrapper>
    </div>
  );
}
