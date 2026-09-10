"use client";

import type { ReactElement } from "react";

import {
  QUADRANT_ROWS,
  THEME,
} from "@/components/features/odontogram/chart-constants";
import { getDesignedToothPaths } from "@/components/features/odontogram/teeth-svg-adapter";
import { ToothNotationLabel, formatToothPlain } from "@/lib/odontogram/notation";
import type { ToothNotation } from "@/lib/odontogram/notation";

const ACCESSIBLE_NAME_EXAMPLE_FDI = 16;

const TOOTH_CELL = "w-10 shrink-0";

function PreviewTooth({ fdi }: { fdi: number }): ReactElement | null {
  const paths = getDesignedToothPaths(fdi, "frontal");
  if (!paths) return null;

  return (
    <svg
      viewBox={paths.viewBox}
      className="h-14 w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={paths.transform ?? undefined}>
        {paths.roots.map((rootD, i) => (
          <path
            key={`root-${i}`}
            d={rootD}
            fill={THEME.rootFill}
            stroke={THEME.rootStroke}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {paths.surfaces.map((sp) =>
          sp.d ? (
            <path
              key={sp.surface}
              d={sp.d}
              fill={THEME.surfaceDefault}
              stroke={THEME.outlineStroke}
              strokeWidth="0.5"
              strokeLinejoin="round"
              strokeOpacity="0.3"
            />
          ) : null,
        )}

        <path
          d={paths.outline}
          fill="none"
          stroke={THEME.outlineStroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function QuadrantRow({
  teeth,
  notation,
}: {
  teeth: readonly number[];
  notation: ToothNotation;
}): ReactElement {
  return (
    <div className="flex gap-0.5">
      {teeth.map((fdi) => (
        <div key={fdi} className={`flex flex-col items-center ${TOOTH_CELL}`}>
          <PreviewTooth fdi={fdi} />
          <ToothNotationLabel
            fdi={fdi}
            notation={notation}
            className="mt-1 font-mono text-[11px] text-ink"
          />
        </div>
      ))}
    </div>
  );
}

function Arch({
  label,
  right,
  left,
  notation,
}: {
  label: string;
  right: readonly number[];
  left: readonly number[];
  notation: ToothNotation;
}): ReactElement {
  return (
    <div className="space-y-2">
      <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="flex justify-center gap-3">
        <QuadrantRow teeth={right} notation={notation} />
        <div className="w-px self-stretch bg-hairline" />
        <QuadrantRow teeth={left} notation={notation} />
      </div>
    </div>
  );
}

export function OdontogramNotationPreview({
  notation,
}: {
  notation: ToothNotation;
}): ReactElement {
  const { upperRight, upperLeft, lowerLeft, lowerRight } = QUADRANT_ROWS;

  return (
    <div
      role="img"
      tabIndex={0}
      aria-label={`Previsualización del odontograma: las 32 piezas permanentes con la numeración seleccionada. La pieza FDI ${ACCESSIBLE_NAME_EXAMPLE_FDI} se muestra como ${formatToothPlain(ACCESSIBLE_NAME_EXAMPLE_FDI, notation)}.`}
      className="overflow-x-auto rounded-xl border border-hairline bg-surface p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div aria-hidden="true" className="flex w-max flex-col gap-3">
        <Arch
          label="Arcada superior"
          right={upperRight}
          left={upperLeft}
          notation={notation}
        />
        <div className="border-t border-dashed border-hairline" />
        <Arch
          label="Arcada inferior"
          right={lowerRight}
          left={lowerLeft}
          notation={notation}
        />
      </div>
    </div>
  );
}
