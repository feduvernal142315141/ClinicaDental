"use client";

import type { ReactElement } from "react";

import {
  QUADRANT_ROWS,
  THEME,
} from "@/components/features/odontogram/chart-constants";
import { getDesignedToothPaths } from "@/components/features/odontogram/teeth-svg-adapter";
import { ToothNotationLabel, formatToothPlain } from "@/lib/odontogram/notation";
import type { ToothNotation } from "@/lib/odontogram/notation";

/**
 * Pieza de ejemplo para el nombre accesible. 16 es el caso que más cambia entre
 * nomenclaturas (FDI 16 · Universal 3 · Palmer 6 superior derecho), así que una
 * sola frase le dice al lector de pantalla qué acaba de pasar al cambiar el
 * ajuste. Sale del ÚNICO formateador del repo — aquí no hay catálogo propio.
 */
const EXAMPLE_FDI = 16;

/**
 * Tamaño de celda. La carta real usa `w-[3.2rem] h-[4.5rem]` por pieza
 * (`odontogram-grid.tsx`); aquí se reduce a `w-10 h-14` (40×56 px), que
 * conserva esa proporción (3.2/4.5 ≈ 40/56) y baja el ancho intrínseco de
 * ~872 px a ~700 px. Aun así la preview vive en su propio contenedor con
 * `overflow-x-auto`: en la app la carta está dentro de un lienzo con zoom, y
 * aquí no lo hay. Regla del repo: el contenido ancho scrollea en su caja.
 */
const TOOTH_CELL = "w-10 shrink-0";

/**
 * Una pieza, vista frontal (vestibular), sin estado clínico.
 *
 * Pinta lo mismo que la carta real y en el mismo orden: raíces → superficies →
 * contorno. EL CUERPO DE LA CORONA ESTÁ EN `surfaces`, no en `outline` (que es
 * solo una banda): pintar únicamente contorno y raíces daría dientes huecos.
 * Todas las caras van con `THEME.surfaceDefault` a opacidad 1, que es
 * exactamente el aspecto de una pieza sin tratar.
 *
 * `highlights` no se dibuja porque el adaptador lo devuelve SIEMPRE vacío
 * (el SVG del diseñador no trae paths de detalle); renderizarlo sería código
 * muerto, no paridad.
 */
function PreviewTooth({ fdi }: { fdi: number }): ReactElement | null {
  const paths = getDesignedToothPaths(fdi, "frontal");
  if (!paths) return null;

  return (
    <svg
      viewBox={paths.viewBox}
      className="h-14 w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* La frontal nunca trae `transform` (solo la lateral), pero se propaga
          para no divergir del renderer real si eso cambiara. */}
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

/**
 * Media arcada: las 8 piezas de un cuadrante con su número debajo.
 *
 * Número y diente van en la MISMA celda (la carta real usa dos filas paralelas
 * alineadas por ancho). Es más simple y hace imposible que se desalineen.
 */
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

/** Arcada completa: cuadrante derecho · línea media · cuadrante izquierdo. */
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

/**
 * Previsualización estática del odontograma para Opciones Generales.
 *
 * Las 32 piezas permanentes en vista frontal, con su número en la nomenclatura
 * recibida. Sin estados clínicos, sin símbolos, sin interacción: solo enseña
 * cómo quedará la numeración ANTES de guardar.
 *
 * NO monta `OdontogramModule` (exigiría un adapter y dispararía load/autosave
 * reales sobre un paciente inventado) ni `ToothSVGMultiView` (usa la tienda,
 * que sin módulo montado lanza y con otro montado se engancharía al paciente
 * equivocado). Dibuja directamente con `getDesignedToothPaths`, que es puro.
 *
 * Las filas de cuadrante y la paleta se IMPORTAN de la carta real: si aquí se
 * copiaran, la preview podría divergir de lo que ve la doctora sin que nada lo
 * detecte.
 *
 * Accesibilidad: el bloque entero es una sola imagen (`role="img"`) con nombre
 * accesible; el detalle repetitivo va `aria-hidden` para que un lector de
 * pantalla no recite 32 piezas de una preview decorativa. El contenedor es
 * enfocable porque scrollea en horizontal (WCAG 2.1.1: lo que se desplaza con
 * el ratón tiene que poder desplazarse con el teclado).
 */
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
      aria-label={`Previsualización del odontograma: las 32 piezas permanentes con la numeración seleccionada. La pieza FDI ${EXAMPLE_FDI} se muestra como ${formatToothPlain(EXAMPLE_FDI, notation)}.`}
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
