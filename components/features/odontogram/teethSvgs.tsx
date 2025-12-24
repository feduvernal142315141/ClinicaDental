import React from "react";
import type { ToothStatus, ToothVariant } from "./consts";

const STATUS_OVERLAY: Record<ToothStatus, string> = {
  sano: "transparent",
  caries: "rgba(248,113,113,0.35)",
  filled: "rgba(96,165,250,0.35)",
  falta: "rgba(156,163,175,0.55)",
  implante: "rgba(245,158,11,0.35)",
};

type SvgProps = { status?: ToothStatus; variant: ToothVariant };

const Gradients = ({ id }: { id: string }) => (
  <>
    <radialGradient id={`g-${id}`} cx="50%" cy="32%" r="60%">
      <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.86" />
      <stop offset="65%" stopColor="#ffffff" stopOpacity="0.22" />
      <stop offset="100%" stopColor="#dbe2ea" stopOpacity="0.12" />
    </radialGradient>
    <linearGradient id={`b-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stopColor="#f9fbfd" />
      <stop offset="60%" stopColor="#f1f5f9" />
      <stop offset="100%" stopColor="#e9eef5" />
    </linearGradient>
  </>
);

// --- Siluetas ---
// ✅ U_CI (incisivo central superior) redibujado: incisal ancho y casi recto,
//   cuello más estrecho y ápice suave (quitar look “gota”).
function crownPath(variant: ToothVariant): string {
  switch (variant) {
    case "U_CI":
      return [
        "M38 18",
        // borde incisal casi recto (ligera curvatura)
        "C 60 18, 80 18, 102 18",
        // caras proximales amplias que bajan hacia el cuello
        "C 124 22, 132 46, 128 76",
        "C 126 90, 118 112, 110 134",
        // tercio cervical/apical (en nuestro canvas se invierte para raíz ↑)
        "C 100 162, 86 182, 70 182",
        "C 54 182, 40 162, 30 134",
        "C 22 112, 14 90, 12 76",
        "C 8 46, 16 22, 38 18",
        "Z",
      ].join(" ");
    // el resto igual que antes
     case "U_LI":
      return [
        "M46 24",
        // Borde incisal ligeramente inclinado (mesial más alto, distal más bajo)
        "C 62 22, 82 24, 102 30",
        // Caras proximales más convergentes que el central
        "C 118 34, 124 56, 120 78",
        "C 118 92, 112 110, 106 130",
        "C 98 154, 86 170, 70 170",
        "C 54 170, 42 154, 34 130",
        "C 28 110, 22 92, 20 78",
        "C 16 56, 24 34, 46 24",
        "Z",
      ].join(" ");
    case "U_CAN":
      return [
        "M70 16",                        // zona de cúspide (arriba en el svg; al rotar queda abajo)
        // lado distal (derecha): más convexo
        "C 84 18, 98 24, 110 36",
        "C 122 50, 124 70, 118 90",
        "C 112 110, 104 130, 96 154",
        // zona apical/cervical
        "C 88 172, 78 182, 70 182",
        // lado mesial (izquierda): más recto hacia el cuello
        "C 62 182, 54 172, 48 154",
        "C 40 130, 32 110, 26 90",
        "C 20 70, 22 50, 34 36",
        "C 46 24, 58 18, 70 16",
        "Z",
      ].join(" ");
    case "U_P1":
      return [
        "M62 26",
        "C 78 24, 94 24, 112 28",
        // distal (derecha) con convexidad suave
        "C 126 36, 132 56, 130 74",
        "C 128 92, 120 112, 112 132",
        // tercio cervical/apical
        "C 102 154, 90 170, 70 178",
        // mesial (izquierda) simétrico pero algo más recto
        "C 50 170, 38 154, 28 132",
        "C 20 112, 12 92, 10 74",
        "C 8 56, 14 36, 28 28",
        "C 44 24, 52 24, 60 26",
        "Z",
      ].join(" ");
    case "U_P2":  return "M80 24c30 0 52 22 50 42-1 7-5 15-10 26-6 11-10 20-13 30-5 14-12 24-18 24s-13-10-18-24c-3-10-7-19-13-30-5-11-9-19-10-26-2-20 20-42 50-42z";
    case "U_M1":  return "M90 22c40 0 68 26 66 50-1 12-7 22-13 35-6 13-11 23-14 34-5 12-12 20-19 20s-14-8-19-20c-3-11-8-21-14-34-6-13-12-23-13-35-2-24 26-50 66-50z";
    case "U_M2":  return "M90 24c36 0 62 24 60 46-1 10-6 20-12 31-6 12-10 21-13 31-4 11-11 19-17 19s-13-8-17-19c-3-10-7-19-13-31-6-11-11-21-12-31-2-22 24-46 60-46z";
    case "U_M3":  return "M90 26c30 0 52 20 50 40-1 9-6 18-11 28-6 10-10 18-12 27-4 10-10 17-16 17s-12-7-16-17c-2-9-6-17-12-27-5-10-10-19-11-28-2-20 20-40 50-40z";
    case "L_CI":  return "M70 22c26 0 44 20 40 44-2 12-6 20-10 33-5 16-11 28-18 28s-13-12-18-28c-4-13-8-21-10-33-4-24 14-44 40-44z";
    case "L_LI":  return "M70 24c22 0 38 18 34 40-2 11-6 19-9 31-5 15-10 26-16 26s-11-11-16-26c-3-12-7-20-9-31-4-22 12-40 34-40z";
    case "L_CAN": return "M70 24c24 0 40 19 37 39-1 9-4 17-8 28-6 16-11 28-18 46-7-18-12-30-18-46-4-11-7-19-8-28-3-20 13-39 37-39z";
    case "L_P1":  return "M80 26c28 0 48 20 46 40-1 7-4 14-9 24-6 10-9 18-12 27-4 12-10 21-15 21s-11-9-15-21c-3-9-6-17-12-27-5-10-8-17-9-24-2-20 18-40 46-40z";
    case "L_P2":  return "M80 28c26 0 46 18 44 36-1 6-4 13-9 22-5 9-9 17-11 25-4 11-9 19-15 19s-11-8-15-19c-2-8-6-16-11-25-5-9-8-16-9-22-2-18 18-36 44-36z";
    case "L_M1":  return "M90 26c34 0 58 22 56 42-1 10-6 18-12 29-5 11-9 20-12 30-4 10-10 18-16 18s-12-8-16-18c-3-10-7-19-12-30-6-11-11-19-12-29-2-20 22-42 56-42z";
    case "L_M2":  return "M90 28c30 0 52 20 50 38-1 9-6 17-11 27-5 10-9 18-12 27-4 10-9 17-15 17s-11-7-15-17c-3-9-7-17-12-27-5-10-10-18-11-27-2-18 20-38 50-38z";
    case "L_M3":  return "M90 30c26 0 44 16 42 32-1 7-5 15-10 24-5 9-9 16-11 24-3 9-9 16-14 16s-11-7-14-16c-2-8-6-15-11-24-5-9-9-17-10-24-2-16 16-32 42-32z";
    default:      return "M70 20c28 0 46 22 42 46-2 12-6 20-10 32-6 18-12 32-20 32s-14-14-20-32c-4-12-8-20-10-32-4-24 14-46 42-46z";
  }
}

function glowEllipse(variant: ToothVariant) {
  switch (variant) {
    case "U_CI": return { cx: 70, cy: 66, rx: 40, ry: 44 };
    // resto igual
    case "U_LI": return { cx: 70, cy: 64, rx: 34, ry: 40 };
    case "U_CAN": return { cx: 70, cy: 68, rx: 32, ry: 42 };
    case "U_P1": return { cx: 80, cy: 64, rx: 36, ry: 42 };
    case "U_P2": return { cx: 80, cy: 62, rx: 38, ry: 42 };
    case "U_M1": return { cx: 90, cy: 64, rx: 48, ry: 46 };
    case "U_M2": return { cx: 90, cy: 64, rx: 44, ry: 44 };
    case "U_M3": return { cx: 90, cy: 64, rx: 40, ry: 40 };
    case "L_CI": return { cx: 70, cy: 72, rx: 30, ry: 40 };
    case "L_LI": return { cx: 70, cy: 74, rx: 28, ry: 36 };
    case "L_CAN": return { cx: 70, cy: 78, rx: 30, ry: 40 };
    case "L_P1":
    case "L_P2": return { cx: 80, cy: 74, rx: 34, ry: 40 };
    case "L_M1": return { cx: 90, cy: 76, rx: 44, ry: 44 };
    case "L_M2": return { cx: 90, cy: 76, rx: 40, ry: 42 };
    case "L_M3": return { cx: 90, cy: 76, rx: 36, ry: 38 };
    default:      return { cx: 70, cy: 64, rx: 32, ry: 42 };
  }
}

function DetailMark({ variant }: { variant: ToothVariant }) {
  const stroke = "#64748b";
  const baseProps = { stroke, strokeWidth: 2, strokeOpacity: 0.45, strokeLinecap: "round" as const };

  if (variant === "U_CI" || variant === "L_CI") {
    return <path d="M44 26 C 62 22, 78 22, 96 26" fill="none" {...baseProps} />;
  }
  if (variant === "U_LI" || variant === "L_LI") {
    // rayita con leve pendiente distal (se espeja en 22/32 por mirror)
    return <path d="M48 28 C 68 24, 88 26, 104 30" fill="none" {...baseProps} />;
  }

  if (variant === "U_CAN" || variant === "L_CAN") {
    // pequeña marca en la cúspide (oblicua)
    return <path d="M58 24 C 68 20, 84 22, 98 28" fill="none" {...baseProps} />;
  }
  if (variant === "U_P1") {
    const y = 33;          // altura (recuerda: en superiores y pequeña = “abajo” tras rotación)
    const cx = 75;         // centro de la cruz (mueve esto para distal/mesial)
    const len = 50;        // ← LARGO de la línea horizontal
    const half = len / 2;

    return (
      <g {...baseProps}>
        <line x1={cx - half} y1={y} x2={cx + half} y2={y} />
        <line x1={cx}        y1={y - 6} x2={cx}        y2={y + 6} />
      </g>
    );
  }
  if (["U_M1","U_M2","U_M3","L_M1","L_M2","L_M3"].includes(variant)) {
    return (
      <g {...baseProps}>
        <line x1="72" y1="66" x2="108" y2="66" />
        <line x1="90" y1="50" x2="90" y2="82" />
      </g>
    );
  }
  return null;
}

export const RealToothSVG: React.FC<SvgProps> = ({ status = "sano", variant }) => {
  const id = `tooth-${variant}`;
  const d = crownPath(variant);
  const glow = glowEllipse(variant);

  return (
     <svg viewBox="0 0 180 220" className="w-[68px] h-[86px]">
        <defs><Gradients id={id} /></defs>

        {/* base + borde + brillo */}
        <path d={d} fill={`url(#b-${id})`} />
        <path d={d} fill="none" stroke="#64748b" strokeOpacity="0.45" strokeWidth="1.1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <ellipse cx={glow.cx} cy={glow.cy} rx={glow.rx} ry={glow.ry} fill={`url(#g-${id})`} />

        {/* overlay de estado */}
        <path d={d} fill={STATUS_OVERLAY[status]} />

        {/* detalles encima del overlay */}
        <DetailMark variant={variant} />
    </svg>
  );
};

export default RealToothSVG;
