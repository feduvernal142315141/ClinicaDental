"use client"

import { useState } from "react"
import type { ToothSurface, SurfaceState } from "./types"
import { cn } from "@/lib/odontogram/utils"

interface SurfaceSelectorProps {
  toothNumber: number
  surfaces: SurfaceState[]
  onSurfaceToggle: (surface: ToothSurface) => void
  disabled?: boolean
}

function isAnterior(toothNumber: number): boolean {
  const position = toothNumber % 10
  return position >= 1 && position <= 3
}

export function SurfaceSelector({ toothNumber, surfaces, onSurfaceToggle, disabled }: SurfaceSelectorProps) {
  const [hoveredSurface, setHoveredSurface] = useState<ToothSurface | null>(null)
  const anterior = isAnterior(toothNumber)

  const getSurfaceState = (surface: ToothSurface): SurfaceState | undefined => {
    return surfaces.find((s) => s.surface === surface)
  }

  const isSelected = (surface: ToothSurface): boolean => {
    return surfaces.some((s) => s.surface === surface)
  }

  const getSurfaceColor = (surface: ToothSurface): string => {
    const state = getSurfaceState(surface)
    return state?.color || "#E5E7EB"
  }

  const handleSurfaceClick = (surface: ToothSurface) => {
    if (!disabled) {
      onSurfaceToggle(surface)
    }
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 200 240" className="w-full h-auto max-h-64">
        {/* Mesial (M) - Left */}
        <path
          d="M 40 60 L 40 180 L 60 200 L 60 40 Z"
          fill={getSurfaceColor("mesial")}
          stroke="#1F2937"
          strokeWidth="2"
          className={cn(
            "cursor-pointer transition-all duration-150",
            disabled && "cursor-not-allowed opacity-50",
            isSelected("mesial") && "stroke-[4]",
            hoveredSurface === "mesial" && !disabled && "brightness-110 drop-shadow-lg",
          )}
          onClick={() => handleSurfaceClick("mesial")}
          onMouseEnter={() => setHoveredSurface("mesial")}
          onMouseLeave={() => setHoveredSurface(null)}
        >
          <title>Mesial</title>
        </path>

        {/* Distal (D) - Right */}
        <path
          d="M 160 60 L 160 180 L 140 200 L 140 40 Z"
          fill={getSurfaceColor("distal")}
          stroke="#1F2937"
          strokeWidth="2"
          className={cn(
            "cursor-pointer transition-all duration-150",
            disabled && "cursor-not-allowed opacity-50",
            isSelected("distal") && "stroke-[4]",
            hoveredSurface === "distal" && !disabled && "brightness-110 drop-shadow-lg",
          )}
          onClick={() => handleSurfaceClick("distal")}
          onMouseEnter={() => setHoveredSurface("distal")}
          onMouseLeave={() => setHoveredSurface(null)}
        >
          <title>Distal</title>
        </path>

        {/* Facial/Labial (B/Lab) - Front */}
        <path
          d="M 60 40 L 140 40 L 140 200 L 60 200 Z"
          fill={getSurfaceColor("facial")}
          stroke="#1F2937"
          strokeWidth="2"
          className={cn(
            "cursor-pointer transition-all duration-150",
            disabled && "cursor-not-allowed opacity-50",
            isSelected("facial") && "stroke-[4]",
            hoveredSurface === "facial" && !disabled && "brightness-110 drop-shadow-lg",
          )}
          onClick={() => handleSurfaceClick("facial")}
          onMouseEnter={() => setHoveredSurface("facial")}
          onMouseLeave={() => setHoveredSurface(null)}
        >
          <title>{anterior ? "Labial" : "Vestibular"}</title>
        </path>

        {/* Lingual/Palatino (L/Pal) - Back (shown as smaller behind) */}
        <ellipse
          cx="100"
          cy="120"
          rx="30"
          ry="70"
          fill={getSurfaceColor("lingual")}
          stroke="#1F2937"
          strokeWidth="2"
          className={cn(
            "cursor-pointer transition-all duration-150",
            disabled && "cursor-not-allowed opacity-50",
            isSelected("lingual") && "stroke-[4]",
            hoveredSurface === "lingual" && !disabled && "brightness-110 drop-shadow-lg",
          )}
          onClick={() => handleSurfaceClick("lingual")}
          onMouseEnter={() => setHoveredSurface("lingual")}
          onMouseLeave={() => setHoveredSurface(null)}
        >
          <title>{anterior ? "Palatino" : "Lingual"}</title>
        </ellipse>

        {/* Oclusal/Incisal (O/I) - Top */}
        <ellipse
          cx="100"
          cy="30"
          rx="40"
          ry="20"
          fill={getSurfaceColor("oclusal")}
          stroke="#1F2937"
          strokeWidth="2"
          className={cn(
            "cursor-pointer transition-all duration-150",
            disabled && "cursor-not-allowed opacity-50",
            isSelected("oclusal") && "stroke-[4]",
            hoveredSurface === "oclusal" && !disabled && "brightness-110 drop-shadow-lg",
          )}
          onClick={() => handleSurfaceClick("oclusal")}
          onMouseEnter={() => setHoveredSurface("oclusal")}
          onMouseLeave={() => setHoveredSurface(null)}
        >
          <title>{anterior ? "Incisal" : "Oclusal"}</title>
        </ellipse>

        {/* Labels */}
        <text x="25" y="125" fontSize="16" fill="#1F2937" fontWeight="bold" pointerEvents="none">
          M
        </text>
        <text x="170" y="125" fontSize="16" fill="#1F2937" fontWeight="bold" pointerEvents="none">
          D
        </text>
        <text x="92" y="125" fontSize="16" fill="#1F2937" fontWeight="bold" pointerEvents="none">
          {anterior ? "P" : "L"}
        </text>
        <text x="92" y="35" fontSize="16" fill="#1F2937" fontWeight="bold" pointerEvents="none">
          {anterior ? "I" : "O"}
        </text>
        <text x="85" y="155" fontSize="16" fill="#1F2937" fontWeight="bold" pointerEvents="none">
          {anterior ? "Lab" : "V"}
        </text>
      </svg>
    </div>
  )
}
