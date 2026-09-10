"use client";

import { OdontogramLegend } from "./odontogramLeyend";
import { ToothSVGMultiView } from "./tooth-svg-multi-view";
import { ResponsiveOdontogramWrapper } from "./responsive-odontogram-wrapper";
import { DentitionSwitch } from "./ui/DentitionSwitch";
import type { Tooth } from "./types";
import { useOdontogramStore } from "@/lib/odontogram/store";
import { ToothNotationLabel } from "@/lib/odontogram/notation";
import {
  quadrantRowsFor,
  type QuadrantRows,
} from "@/lib/odontogram/domain/odontogram/constants/dentition.constants";

interface OdontogramGridProps {
  teeth: Tooth[];
  /** El clic abre el modal de la pieza. La grilla NO selecciona caras: las
   *  superficies se marcan dentro del modal. */
  onToothClick: (toothNumber: number) => void;
}

const UPPER_VIEWS = ["frontal", "oclusal", "lateral"] as const;
const LOWER_VIEWS = ["lateral", "oclusal", "frontal"] as const;

export function OdontogramGrid({ onToothClick }: OdontogramGridProps) {
  const notation = useOdontogramStore((state) => state.notation);
  const dentition = useOdontogramStore((state) => state.dentition);
  // Exterior→interior: en mixta los permanentes envuelven a los temporales.
  const rowSets = quadrantRowsFor(dentition);

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
      frontal:
        "w-[3.2rem] h-[4.5rem] cursor-pointer hover:opacity-80 transition-opacity",
      oclusal:
        "w-[3.2rem] h-[3.2rem] cursor-pointer hover:opacity-80 transition-opacity",
      lateral:
        "w-[3.2rem] h-[4rem] cursor-pointer hover:opacity-80 transition-opacity",
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

  const renderArch = (
    rows: QuadrantRows,
    arch: "upper" | "lower",
    key: string,
  ) => {
    const right = arch === "upper" ? rows.upperRight : rows.lowerRight;
    const left = arch === "upper" ? rows.upperLeft : rows.lowerLeft;
    const views = arch === "upper" ? UPPER_VIEWS : LOWER_VIEWS;

    return (
      <div key={key} className="space-y-1.5">
        {views.map((view) => (
          <div key={view} className="flex justify-center gap-3">
            {renderToothRow(right, view)}
            <div className="w-px bg-border" />
            {renderToothRow(left, view)}
          </div>
        ))}

        {/* Números de dientes */}
        <div className="flex justify-center gap-3 text-xs text-center font-mono text-muted-foreground">
          {renderNumberRow(right)}
          <div className="w-px" />
          {renderNumberRow(left)}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full flex flex-col h-full flex-1 min-h-0">
      {/* Fuera del zoom: la dentición se cambia sin depender del lienzo. */}
      <DentitionSwitch className="absolute top-3 left-3 z-30" />

      <ResponsiveOdontogramWrapper overlay={<OdontogramLegend />}>
        {/* Ancho intrínseco: el lienzo mide este bloque, no se asume en píxeles */}
        <div className="flex w-max flex-col px-1 py-1">
          {/* Arcada Superior */}
          <div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Arcada Superior
            </div>
            <div className="flex flex-col gap-3">
              {rowSets.map((set) =>
                renderArch(set.rows, "upper", `upper-${set.primary}`),
              )}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-border my-3" />

          {/* Arcada Inferior */}
          <div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Arcada Inferior
            </div>
            <div className="flex flex-col gap-3">
              {[...rowSets]
                .reverse()
                .map((set) =>
                  renderArch(set.rows, "lower", `lower-${set.primary}`),
                )}
            </div>
          </div>
        </div>
      </ResponsiveOdontogramWrapper>
    </div>
  );
}
