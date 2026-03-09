"use client"

import dynamic from "next/dynamic"
import { useOdontogramStore } from "@/lib/odontogram/store"
import type { ToothSurface } from "./types"
import { useMemo } from "react"
import { getToothType } from "./tooth-svg-definitions"
import { ToothSymbolService } from "@/lib/odontogram/domain/odontogram/services/ToothSymbolService"

interface ToothSVGMultiViewProps {
  toothNumber: number
  view: "frontal" | "oclusal" | "lateral"
  surfaceTreatments?: any[]
  surfaceConditions?: any[]
  onSurfaceClick: (surface: ToothSurface) => void
}

function _ToothSVGMultiView({ toothNumber, view, onSurfaceClick }: ToothSVGMultiViewProps) {
  const isClient = typeof window !== "undefined"

  const clinicalEvents = isClient ? useOdontogramStore((state) => state.clinicalEvents) : []
  const getSurfaceColor = isClient
    ? useOdontogramStore((state) => state.getSurfaceColor)
    : () => "transparent"

  const surfaceColors = useMemo(() => {
    const surfaces: ToothSurface[] = ["oclusal", "facial", "lingual", "mesial", "distal"]
    return surfaces.reduce(
      (acc, surface) => {
        acc[surface] = getSurfaceColor(toothNumber, surface)
        return acc
      },
      {} as Record<ToothSurface, string>,
    )
  }, [toothNumber, getSurfaceColor, clinicalEvents])

  const toothSymbol = useMemo(() => {
    if (!isClient) return null
    return ToothSymbolService.getToothSymbol(toothNumber, clinicalEvents)
  }, [toothNumber, clinicalEvents, isClient])

  const toothType = getToothType(toothNumber)

  if (view === "lateral") {
    return <LateralView toothNumber={toothNumber} toothType={toothType} surfaceColors={surfaceColors} symbol={toothSymbol} onSurfaceClick={onSurfaceClick} />
  }

  if (view === "oclusal") {
    return <OclusualView toothType={toothType} surfaceColors={surfaceColors} symbol={toothSymbol} onSurfaceClick={onSurfaceClick} />
  }

  return <FrontalView toothType={toothType} surfaceColors={surfaceColors} symbol={toothSymbol} onSurfaceClick={onSurfaceClick} />
}

/* --------------------------- LATERAL VIEW --------------------------- */
function LateralView({
  toothNumber,
  toothType,
  surfaceColors,
  symbol,
  onSurfaceClick,
}: {
  toothNumber: number
  toothType: string
  surfaceColors: Record<ToothSurface, string>
  symbol: string | null
  onSurfaceClick: (surface: ToothSurface) => void
}) {
  const isMolar = toothType === "molar"
  const width = isMolar ? 50 : 40
  const height = 70

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <rect
        x={isMolar ? 5 : 8}
        y="5"
        width={isMolar ? 40 : 24}
        height="25"
        rx="4"
        fill={surfaceColors.facial !== "transparent" ? surfaceColors.facial : "#F5F0E8"}
        stroke="#D4C5A9"
        strokeWidth="1.5"
        className="cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => onSurfaceClick("facial")}
      />

      {isMolar ? (
        <>
          <path
            d="M 12 30 L 10 60 Q 10 65 15 65 L 18 65 Q 20 65 20 60 L 22 30 Z"
            fill="#D4C5A9"
            stroke="#B8A889"
            strokeWidth="1.5"
          />
          <path
            d="M 28 30 L 30 60 Q 30 65 35 65 L 38 65 Q 40 65 40 60 L 38 30 Z"
            fill="#D4C5A9"
            stroke="#B8A889"
            strokeWidth="1.5"
          />
        </>
      ) : (
        <path
          d={`M ${width / 2 - 6} 30 L ${width / 2 - 4} 60 Q ${width / 2 - 4} 65 ${width / 2} 65 L ${width / 2 + 4} 65 Q ${width / 2 + 4} 65 ${width / 2 + 4} 60 L ${width / 2 + 6} 30 Z`}
          fill="#D4C5A9"
          stroke="#B8A889"
          strokeWidth="1.5"
        />
      )}

      {surfaceColors.lingual !== "transparent" && (
        <circle
          cx={width / 2 + 8}
          cy="17"
          r="4"
          fill={surfaceColors.lingual}
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("lingual")
          }}
        />
      )}

      {surfaceColors.oclusal !== "transparent" && (
        <circle
          cx={width / 2}
          cy="10"
          r="4"
          fill={surfaceColors.oclusal}
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("oclusal")
          }}
        />
      )}
    </svg>
  )
}

/* --------------------------- OCLUSAL VIEW --------------------------- */
function OclusualView({
  toothType,
  surfaceColors,
  symbol,
  onSurfaceClick,
}: {
  toothType: string
  surfaceColors: Record<ToothSurface, string>
  symbol: string | null
  onSurfaceClick: (surface: ToothSurface) => void
}) {
  const isMolar = toothType === "molar"
  const isPremolar = toothType === "premolar"
  const size = isMolar ? 45 : isPremolar ? 38 : 32

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <ellipse cx={size / 2} cy={size / 2} rx={size / 2 - 3} ry={size / 2 - 3} fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1.5" />

      {isMolar && (
        <>
          <line x1={size / 2} y1="3" x2={size / 2} y2={size - 3} stroke="#D4C5A9" strokeWidth="1" />
          <line x1="3" y1={size / 2} x2={size - 3} y2={size / 2} stroke="#D4C5A9" strokeWidth="1" />
          <line x1="8" y1="8" x2={size - 8} y2={size - 8} stroke="#D4C5A9" strokeWidth="1" />
          <line x1={size - 8} y1="8" x2="8" y2={size - 8} stroke="#D4C5A9" strokeWidth="1" />
        </>
      )}

      {isPremolar && (
        <>
          <line x1={size / 2} y1="3" x2={size / 2} y2={size - 3} stroke="#D4C5A9" strokeWidth="1" />
          <line x1="3" y1={size / 2} x2={size - 3} y2={size / 2} stroke="#D4C5A9" strokeWidth="1" />
        </>
      )}

      {surfaceColors.oclusal !== "transparent" && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r="6"
          fill={surfaceColors.oclusal}
          fillOpacity="0.8"
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-opacity hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("oclusal")
          }}
        />
      )}

      {surfaceColors.mesial !== "transparent" && (
        <path
          d={`M ${size / 2} ${size / 2} L ${size / 2} 3 A ${size / 2 - 3} ${size / 2 - 3} 0 0 1 ${size - 3} ${size / 2} Z`}
          fill={surfaceColors.mesial}
          fillOpacity="0.7"
          className="cursor-pointer transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("mesial")
          }}
        />
      )}

      {surfaceColors.distal !== "transparent" && (
        <path
          d={`M ${size / 2} ${size / 2} L 3 ${size / 2} A ${size / 2 - 3} ${size / 2 - 3} 0 0 1 ${size / 2} 3 Z`}
          fill={surfaceColors.distal}
          fillOpacity="0.7"
          className="cursor-pointer transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("distal")
          }}
        />
      )}

      {surfaceColors.facial !== "transparent" && (
        <path
          d={`M ${size / 2} ${size / 2} L ${size - 3} ${size / 2} A ${size / 2 - 3} ${size / 2 - 3} 0 0 1 ${size / 2} ${size - 3} Z`}
          fill={surfaceColors.facial}
          fillOpacity="0.7"
          className="cursor-pointer transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("facial")
          }}
        />
      )}

      {surfaceColors.lingual !== "transparent" && (
        <path
          d={`M ${size / 2} ${size / 2} L ${size / 2} ${size - 3} A ${size / 2 - 3} ${size / 2 - 3} 0 0 1 3 ${size / 2} Z`}
          fill={surfaceColors.lingual}
          fillOpacity="0.7"
          className="cursor-pointer transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("lingual")
          }}
        />
      )}

      {/* Símbolo profesional (letra indicando tipo de tratamiento) */}
      {symbol && (
        <text
          x={size / 2}
          y={size / 2 + 3}
          fontSize={isMolar ? "10" : "9"}
          fontWeight="700"
          textAnchor="middle"
          fill="#1F2937"
          stroke="#FFFFFF"
          strokeWidth="0.5"
          pointerEvents="none"
          style={{ userSelect: "none" }}
        >
          {symbol}
        </text>
      )}
    </svg>
  )
}

/* --------------------------- FRONTAL VIEW --------------------------- */
function FrontalView({
  toothType,
  surfaceColors,
  symbol,
  onSurfaceClick,
}: {
  toothType: string
  surfaceColors: Record<ToothSurface, string>
  symbol: string | null
  onSurfaceClick: (surface: ToothSurface) => void
}) {
  const isMolar = toothType === "molar"
  const isPremolar = toothType === "premolar"
  const width = isMolar ? 50 : isPremolar ? 40 : 30
  const height = 70

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <rect
        x="5"
        y="5"
        width={width - 10}
        height="30"
        rx="5"
        fill={surfaceColors.facial !== "transparent" ? surfaceColors.facial : "#F5F0E8"}
        stroke="#D4C5A9"
        strokeWidth="1.5"
        className="cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => onSurfaceClick("facial")}
      />

      {isMolar ? (
        <>
          <rect x="8" y="35" width="12" height="30" rx="2" fill="#D4C5A9" stroke="#B8A889" strokeWidth="1.5" />
          <rect x={width - 20} y="35" width="12" height="30" rx="2" fill="#D4C5A9" stroke="#B8A889" strokeWidth="1.5" />
        </>
      ) : isPremolar ? (
        <>
          <rect x="10" y="35" width="8" height="30" rx="2" fill="#D4C5A9" stroke="#B8A889" strokeWidth="1.5" />
          <rect x={width - 18} y="35" width="8" height="30" rx="2" fill="#D4C5A9" stroke="#B8A889" strokeWidth="1.5" />
        </>
      ) : (
        <rect x={width / 2 - 4} y="35" width="8" height="30" rx="2" fill="#D4C5A9" stroke="#B8A889" strokeWidth="1.5" />
      )}

      {surfaceColors.mesial !== "transparent" && (
        <circle
          cx="12"
          cy="20"
          r="4"
          fill={surfaceColors.mesial}
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("mesial")
          }}
        />
      )}

      {surfaceColors.distal !== "transparent" && (
        <circle
          cx={width - 12}
          cy="20"
          r="4"
          fill={surfaceColors.distal}
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={(e) => {
            e.stopPropagation()
            onSurfaceClick("distal")
          }}
        />
      )}
    </svg>
  )
}

/* ✅ Export nombrado con SSR desactivado */
export const ToothSVGMultiView = dynamic(() => Promise.resolve(_ToothSVGMultiView), { ssr: false })
