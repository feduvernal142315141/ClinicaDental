"use client"

import { cn } from "@/lib/odontogram/utils"
import type { ToothSurface, SurfaceTreatment } from "./types"

interface ToothSVGAdvancedProps {
  toothNumber: number
  view: "frontal" | "oclusal" | "lateral"
  surfaceTreatments: SurfaceTreatment[]
  onSurfaceClick?: (surface: ToothSurface) => void
  className?: string
}

export function ToothSVGAdvanced({
  toothNumber,
  view,
  surfaceTreatments,
  onSurfaceClick,
  className,
}: ToothSVGAdvancedProps) {
  const getSurfaceColor = (surface: ToothSurface) => {
    const treatment = surfaceTreatments.find((t) => t.surface === surface)
    if (!treatment) return "fill-white hover:fill-blue-50"
    return treatment.status === "completed"
      ? "fill-green-200 hover:fill-green-300"
      : "fill-blue-200 hover:fill-blue-300"
  }

  const toothType = () => {
    const num = toothNumber % 10
    if (num >= 6) return "molar"
    if (num >= 4) return "premolar"
    if (num === 3) return "canine"
    return "incisor"
  }

  const type = toothType()
  const isUpper = toothNumber < 30

  // Vista Frontal/Vestibular
  if (view === "frontal") {
    return (
      <svg viewBox="0 0 60 80" className={cn("w-full h-full", className)}>
        <defs>
          <linearGradient id={`grad-${toothNumber}-frontal`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f0" />
            <stop offset="100%" stopColor="#e8e8dc" />
          </linearGradient>
        </defs>

        {type === "molar" && (
          <g>
            {/* Corona */}
            <path
              d="M15 25 Q10 30 10 40 L10 50 Q10 55 15 58 L15 58 Q50 58 50 58 Q50 55 50 50 L50 40 Q50 30 45 25 Q40 20 30 20 Q20 20 15 25 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("facial"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("facial")}
            />
            {/* Raíces */}
            <path d="M20 58 L20 70 Q20 75 25 75 L25 75" className="fill-[#d4c5a0] stroke-gray-400" strokeWidth="1" />
            <path d="M40 58 L40 70 Q40 75 35 75 L35 75" className="fill-[#d4c5a0] stroke-gray-400" strokeWidth="1" />
          </g>
        )}

        {type === "premolar" && (
          <g>
            <path
              d="M20 25 Q15 30 15 40 L15 50 Q15 55 20 58 L40 58 Q45 55 45 50 L45 40 Q45 30 40 25 Q35 20 30 20 Q25 20 20 25 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("facial"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("facial")}
            />
            <path
              d="M25 58 L25 70 Q25 74 30 74 Q35 74 35 70 L35 58"
              className="fill-[#d4c5a0] stroke-gray-400"
              strokeWidth="1"
            />
          </g>
        )}

        {type === "canine" && (
          <g>
            <path
              d="M25 20 Q20 25 20 35 L20 50 Q20 55 25 58 L35 58 Q40 55 40 50 L40 35 Q40 25 35 20 Q32 15 30 15 Q28 15 25 20 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("facial"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("facial")}
            />
            <path
              d="M27 58 L27 72 Q27 75 30 75 Q33 75 33 72 L33 58"
              className="fill-[#d4c5a0] stroke-gray-400"
              strokeWidth="1"
            />
          </g>
        )}

        {type === "incisor" && (
          <g>
            <path
              d="M22 22 Q20 25 20 35 L20 50 Q20 55 25 58 L35 58 Q40 55 40 50 L40 35 Q40 25 38 22 Q35 18 30 18 Q25 18 22 22 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("facial"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("facial")}
            />
            <path
              d="M27 58 L27 72 Q27 75 30 75 Q33 75 33 72 L33 58"
              className="fill-[#d4c5a0] stroke-gray-400"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
    )
  }

  // Vista Oclusal (desde arriba/abajo)
  if (view === "oclusal") {
    return (
      <svg viewBox="0 0 60 60" className={cn("w-full h-full", className)}>
        {type === "molar" && (
          <g>
            {/* Superficie Oclusal */}
            <ellipse
              cx="30"
              cy="30"
              rx="22"
              ry="18"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("oclusal"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("oclusal")}
            />
            {/* Cara Mesial */}
            <path
              d="M30 12 Q20 12 12 20 L12 40 Q20 48 30 48 L30 12 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("mesial"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("mesial")}
            />
            {/* Cara Distal */}
            <path
              d="M30 12 Q40 12 48 20 L48 40 Q40 48 30 48 L30 12 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("distal"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("distal")}
            />
            {/* Surcos */}
            <path d="M30 15 L30 45 M20 30 L40 30" className="stroke-gray-400 stroke-[0.5]" />
          </g>
        )}

        {(type === "premolar" || type === "canine") && (
          <g>
            <ellipse
              cx="30"
              cy="30"
              rx="18"
              ry="15"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("oclusal"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("oclusal")}
            />
            <path
              d="M30 15 Q20 15 15 22 L15 38 Q20 45 30 45 L30 15 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("mesial"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("mesial")}
            />
            <path
              d="M30 15 Q40 15 45 22 L45 38 Q40 45 30 45 L30 15 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("distal"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("distal")}
            />
          </g>
        )}

        {type === "incisor" && (
          <g>
            <rect
              x="18"
              y="20"
              width="24"
              height="20"
              rx="3"
              className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("oclusal"))}
              strokeWidth="1.5"
              onClick={() => onSurfaceClick?.("oclusal")}
            />
            <path
              d="M18 20 L18 40 Q18 42 20 42 L20 20 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("mesial"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("mesial")}
            />
            <path
              d="M42 20 L42 40 Q42 42 40 42 L40 20 Z"
              className={cn("stroke-gray-400 cursor-pointer transition-all opacity-80", getSurfaceColor("distal"))}
              strokeWidth="1"
              onClick={() => onSurfaceClick?.("distal")}
            />
          </g>
        )}
      </svg>
    )
  }

  // Vista Lateral
  return (
    <svg viewBox="0 0 60 80" className={cn("w-full h-full", className)}>
      {type === "molar" && (
        <g>
          <path
            d="M20 25 Q15 30 15 40 L15 50 Q15 55 20 58 L40 58 Q45 55 45 50 L45 40 Q45 30 40 25 Q35 22 30 22 Q25 22 20 25 Z"
            className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("lingual"))}
            strokeWidth="1.5"
            onClick={() => onSurfaceClick?.("lingual")}
          />
          <path
            d="M25 58 L25 70 Q25 74 30 74 Q35 74 35 70 L35 58"
            className="fill-[#d4c5a0] stroke-gray-400"
            strokeWidth="1"
          />
        </g>
      )}

      {(type === "premolar" || type === "canine" || type === "incisor") && (
        <g>
          <path
            d="M22 25 Q18 28 18 38 L18 50 Q18 54 22 57 L38 57 Q42 54 42 50 L42 38 Q42 28 38 25 Q34 22 30 22 Q26 22 22 25 Z"
            className={cn("stroke-gray-400 cursor-pointer transition-all", getSurfaceColor("lingual"))}
            strokeWidth="1.5"
            onClick={() => onSurfaceClick?.("lingual")}
          />
          <path
            d="M27 57 L27 72 Q27 75 30 75 Q33 75 33 72 L33 57"
            className="fill-[#d4c5a0] stroke-gray-400"
            strokeWidth="1"
          />
        </g>
      )}
    </svg>
  )
}
