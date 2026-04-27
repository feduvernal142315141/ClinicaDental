"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface TimelinePoint {
  label: string;
  shortLabel: string;
  appointmentId: string;
  date: string;
  isCurrent: boolean;
  index: number;
}

interface OdontogramHistoryTimelineProps {
  appointments: Appointment[];
  /** Currently selected historic appointment ID (undefined = viewing current state) */
  historicAppointmentId?: string;
  /** Active consultation appointment ID — shown as "Hoy" marker */
  activeAppointmentId?: string;
  onSelectVisit: (appointmentId: string) => void;
  onReturnToCurrent: () => void;
}

/**
 * US-03 — Centered Slides Carousel para navegación temporal del odontograma.
 * Usa Embla Carousel con slides centrados y escalado visual del activo.
 * Soporta de 2 a N citas sin problemas de solapamiento.
 */
export function OdontogramHistoryTimeline({
  appointments,
  historicAppointmentId,
  activeAppointmentId,
  onSelectVisit,
  onReturnToCurrent,
}: OdontogramHistoryTimelineProps) {
  // ── Build timeline points ──────────────────────────────────────────
  const points: TimelinePoint[] = useMemo(() => {
    const eligible = appointments.filter(
      (a) =>
        a.status === "completed" ||
        a.status === "in_progress" ||
        a.id === activeAppointmentId,
    );
    const sorted = [...eligible].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted.map((a, idx) => ({
      label:
        a.id === activeAppointmentId
          ? "Hoy (Consulta Activa)"
          : new Date(a.date).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
      shortLabel:
        a.id === activeAppointmentId
          ? "Hoy"
          : new Date(a.date).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
            }),
      appointmentId: a.id,
      date: a.date,
      isCurrent: a.id === activeAppointmentId,
      index: idx + 1,
    }));
  }, [appointments, activeAppointmentId]);

  // ── Determine initial slide index ──────────────────────────────────
  const initialIndex = useMemo(() => {
    if (historicAppointmentId) {
      const idx = points.findIndex(
        (p) => p.appointmentId === historicAppointmentId,
      );
      return idx >= 0 ? idx : points.length - 1;
    }
    return points.length - 1;
  }, [historicAppointmentId, points]);

  // ── Embla carousel ─────────────────────────────────────────────────
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    loop: false,
    startIndex: initialIndex,
    slidesToScroll: 1,
  });

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const isViewingHistoric = !!historicAppointmentId;

  // Track whether the current scroll was triggered programmatically (prop change)
  const isProgrammaticScroll = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync embla state ───────────────────────────────────────────────
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // ── Debounced auto-select on scroll settle ─────────────────────────
  // When the user swipes/arrows and the carousel settles, auto-fire
  // the visit selection for the centered slide after 500ms.
  useEffect(() => {
    if (!emblaApi) return;

    const onSettle = () => {
      // Skip if this settle was triggered by a programmatic scroll (prop change)
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        return;
      }

      // Clear previous debounce
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const idx = emblaApi.selectedScrollSnap();
        const point = points[idx];
        if (!point) return;

        // If it's the last slide or the active consultation, return to current
        if (point.isCurrent || idx === points.length - 1) {
          onReturnToCurrent();
        } else {
          onSelectVisit(point.appointmentId);
        }
      }, 500);
    };

    emblaApi.on("settle", onSettle);
    return () => {
      emblaApi.off("settle", onSettle);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [emblaApi, points, onSelectVisit, onReturnToCurrent]);

  // ── Scroll to historic appointment when prop changes ───────────────
  useEffect(() => {
    if (!emblaApi) return;
    isProgrammaticScroll.current = true; // Don't trigger auto-select for prop-driven scrolls
    if (historicAppointmentId) {
      const idx = points.findIndex(
        (p) => p.appointmentId === historicAppointmentId,
      );
      if (idx >= 0) emblaApi.scrollTo(idx);
    } else {
      // Return to last (current)
      emblaApi.scrollTo(points.length - 1);
    }
  }, [emblaApi, historicAppointmentId, points]);

  // ── Handle slide click ─────────────────────────────────────────────
  const handleSlideClick = useCallback(
    (point: TimelinePoint, idx: number) => {
      // Clear any pending debounce — the click is the user's intent
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      // Scroll to center the clicked slide
      emblaApi?.scrollTo(idx);
      // Fire the visit selection immediately
      if (point.isCurrent || idx === points.length - 1) {
        onReturnToCurrent();
      } else {
        onSelectVisit(point.appointmentId);
      }
    },
    [emblaApi, onSelectVisit, onReturnToCurrent, points.length],
  );

  // ── Navigation ─────────────────────────────────────────────────────
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Don't render with 0-1 points
  if (points.length < 2) return null;

  return (
    <div className="bg-white border-b border-gray-100 px-2 pt-3 pb-3 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Header with counter + return button */}
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Historial de visitas
            {points.length > 5 && (
              <span className="ml-1 text-slate-300">
                ({selectedIndex + 1} de {points.length})
              </span>
            )}
          </span>
          {isViewingHistoric && (
            <button
              onClick={onReturnToCurrent}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Volver al actual
            </button>
          )}
        </div>

        {/* Carousel container with arrows */}
        <div className="relative flex items-center">
          {/* Left arrow */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full
                       bg-white border border-slate-200 text-slate-400
                       hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200
                       disabled:opacity-0 disabled:pointer-events-none
                       transition-all duration-200 mr-1 shadow-sm"
            aria-label="Visita anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Embla viewport */}
          <div className="overflow-hidden flex-1" ref={emblaRef}>
            <div className="flex">
              {points.map((point, idx) => {
                const isActive = idx === selectedIndex;

                return (
                  <div
                    key={point.appointmentId}
                    className="flex-[0_0_33.333%] min-w-0 px-1.5"
                    style={{ minWidth: 0 }}
                  >
                    <button
                      onClick={() => handleSlideClick(point, idx)}
                      className={[
                        "w-full rounded-lg border px-3 py-2.5 text-center transition-all duration-300 cursor-pointer",
                        "focus:outline-none focus:ring-2 focus:ring-blue-300",
                        isActive
                          ? "border-blue-400 bg-blue-50 shadow-md scale-100"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30 scale-[0.88] opacity-60",
                        point.isCurrent && isActive
                          ? "border-blue-500 bg-blue-500 text-white shadow-lg"
                          : "",
                      ].join(" ")}
                    >
                      {/* Date */}
                      <p
                        className={[
                          "text-xs font-bold leading-tight",
                          point.isCurrent && isActive
                            ? "text-white"
                            : isActive
                              ? "text-blue-700"
                              : "text-slate-500",
                        ].join(" ")}
                      >
                        {point.shortLabel}
                      </p>

                      {/* Year (only if not "Hoy") */}
                      {!point.isCurrent && (
                        <p
                          className={[
                            "text-[10px] leading-tight mt-0.5",
                            isActive
                              ? "text-blue-500"
                              : "text-slate-400",
                          ].join(" ")}
                        >
                          {new Date(point.date).getFullYear()}
                        </p>
                      )}

                      {/* Status indicator */}
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span
                          className={[
                            "block w-1.5 h-1.5 rounded-full",
                            point.isCurrent
                              ? isActive
                                ? "bg-white"
                                : "bg-blue-500"
                              : isActive
                                ? "bg-blue-400"
                                : "bg-slate-300",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "text-[9px] uppercase tracking-wider font-medium",
                            point.isCurrent
                              ? isActive
                                ? "text-blue-100"
                                : "text-blue-500"
                              : isActive
                                ? "text-blue-400"
                                : "text-slate-400",
                          ].join(" ")}
                        >
                          {point.isCurrent ? "Activa" : `#${point.index}`}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full
                       bg-white border border-slate-200 text-slate-400
                       hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200
                       disabled:opacity-0 disabled:pointer-events-none
                       transition-all duration-200 ml-1 shadow-sm"
            aria-label="Visita siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mini progress bar */}
        {points.length > 5 && (
          <div className="mt-2 mx-8 h-0.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(
                  5,
                  ((selectedIndex + 1) / points.length) * 100,
                )}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
