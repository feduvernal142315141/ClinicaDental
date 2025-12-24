"use client";
import React, { useMemo, useState } from "react";
import { TEETH_MAP, ToothStatus, FDI_ORDER_UPPER, FDI_ORDER_LOWER } from "./consts";
import { Tooth } from "./Tooth";

export type OdontogramValue = Record<string, ToothStatus>;

type Pt = { x: number; y: number };
const bezier = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t, tt = t * t, uu = u * u;
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
  };
};

function positionsOnBezier(ids: string[], p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
  const n = ids.length;
  return ids.map((id, i) => {
    const lin = n === 1 ? 0.5 : i / (n - 1);
    const t = 0.5 + (lin - 0.5) * 0.95;
    const { x, y } = bezier(p0, p1, p2, p3, t);
    return { id, x, y };
  });
}

function scaleForFDI(id: string, arch: "upper" | "lower") {
  const pos = parseInt(id[1], 10);
  let s =
    pos === 1 ? 1.28 : // centrales sup más grandes
    pos === 2 ? 1.16 : // ⬅️ antes 1.10 — laterales sup un poco mayores
    pos === 3 ? 1.20 :
    pos === 4 ? 1.10 :
    pos === 5 ? 1.04 :
    pos === 6 ? 1.12 :
    pos === 7 ? 1.08 :
    0.96;
  if (arch === "lower") s *= 0.92;
  return s;
}
function offsetYForFDI(id: string, arch: "upper" | "lower") {
  const pos = parseInt(id[1], 10);
  const upper = { 1: -8, 2: -6, 3: -4, 4: -2, 5: -2, 6: 0, 7: 2, 8: 4 } as Record<number, number>;
  const lower = { 1: 10, 2: 8, 3: 6, 4: 2, 5: 2, 6: 0, 7: -2, 8: -2 } as Record<number, number>;
  return arch === "upper" ? (upper[pos] ?? 0) : (lower[pos] ?? 0);
}
function tiltDegForFDI(id: string, arch: "upper" | "lower") {
  const pos = parseInt(id[1], 10);
  const base =
    pos === 1 ? 0  :
    pos === 2 ? 6  :
    pos === 3 ? 10 :
    pos === 4 ? 12 :
    pos === 5 ? 14 :
    pos === 6 ? 16 :
    pos === 7 ? 18 :
    20;
  const q = parseInt(id[0], 10);
  const sign = (q === 1 || q === 4) ? -1 : 1;
  const arcAdj = arch === "upper" ? 0 : 2;
  return sign * (base + arcAdj);
}

function xOffsetForMidline(id: string, arch: "upper" | "lower") {
  const pos = parseInt(id[1], 10);    // 1..8
  if (pos !== 1) return 0;            // solo incisivos centrales
  const q = parseInt(id[0], 10);      // 1..4
  const sign = (q === 1 || q === 4) ? -1 : 1;  // lado izq -> -, der -> +
  const HALF_GAP = arch === "upper" ? 8 : 7;   // px por pieza (total 16/14)
  return sign * HALF_GAP;
}

export const Odontogram: React.FC<{ value?: OdontogramValue; onChange?: (n: OdontogramValue) => void; }>
= ({ value = {}, onChange }) => {
  const [local, setLocal] = useState<OdontogramValue>(value);
  const upperMap = useMemo(() => TEETH_MAP.filter((t) => t.arch === "upper"), []);
  const lowerMap = useMemo(() => TEETH_MAP.filter((t) => t.arch === "lower"), []);
  const setTooth = (id: string, status: ToothStatus) => {
    setLocal((prev) => { const next = { ...prev, [id]: status }; onChange?.(next); return next; });
  };

  const width = 1100, height = 460, cx = width / 2;
  const U0 = { x: cx - 470, y: 200 }, U1 = { x: cx - 230, y: 95 },  U2 = { x: cx + 230, y: 95 },  U3 = { x: cx + 470, y: 200 };
  const L0 = { x: cx - 470, y: 320 }, L1 = { x: cx - 230, y: 410 }, L2 = { x: cx + 230, y: 410 }, L3 = { x: cx + 470, y: 320 };

  const upperPos = positionsOnBezier(FDI_ORDER_UPPER, U0, U1, U2, U3);
  const lowerPos = positionsOnBezier(FDI_ORDER_LOWER, L0, L1, L2, L3);

  return (
    <div className="w-full mx-auto p-4" style={{ maxWidth: width }}>

      <div className="relative" style={{ width, height }}>
        <div className="absolute left-0 right-0 text-xs text-gray-500" style={{ top: U1.y - 30 }}>
          Arco superior
        </div>
        {upperPos.map(({ id, x, y }) => {
          const info = upperMap.find((t) => t.id === id)!;
          return (
            <Tooth
              key={id}
              info={info}
              value={local[id] || "sano"}
              onChange={setTooth}
              orientation="crown-up" // raíz hacia arriba (superior)
              rotationDeg={tiltDegForFDI(id, "upper")}
              scale={scaleForFDI(id, "upper")}
              style={{
                left: x + xOffsetForMidline(id, "upper"),   // ← separación
                top: y + offsetYForFDI(id, "upper"),
              }}
            />
          );
        })}

        <div className="absolute left-0 right-0 text-xs text-gray-500" style={{ top: L1.y + 20 }}>
          Arco inferior
        </div>
        {lowerPos.map(({ id, x, y }) => {
          const info = lowerMap.find((t) => t.id === id)!;
          return (
            <Tooth
              key={id}
              info={info}
              value={local[id] || "sano"}
              onChange={setTooth}
              orientation="crown-down" // raíz hacia abajo (inferior)
              rotationDeg={tiltDegForFDI(id, "lower")}
              scale={scaleForFDI(id, "lower")}
              style={{
                left: x + xOffsetForMidline(id, "lower"),   // ← separación
                top: y + offsetYForFDI(id, "lower"),
              }}
            />
          );
        })}
      </div>

      <pre className="mt-6 bg-gray-50 p-3 text-xs rounded border border-gray-200 overflow-auto max-h-64">
        {JSON.stringify(local, null, 2)}
      </pre>
    </div>
  );
};
