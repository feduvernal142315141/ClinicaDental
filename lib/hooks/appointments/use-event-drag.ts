"use client";

import { useCallback, useRef, useState } from "react";
import type { SchedulerEvent } from "@/lib/entity/appointment";

interface DragVisual {
  id: string;
  dx: number;
  dy: number;
}

/** Umbral en px para distinguir un arrastre real de un toque accidental. */
const DRAG_THRESHOLD = 6;

/**
 * Lógica de pointer-drag reutilizable para arrastrar eventos del scheduler.
 *
 * El handler `onPointerDown` se conecta a un "grip" (asa) del evento, que se
 * renderiza como HERMANO del trigger del menú y por encima (z mayor); por eso
 * el pointerdown sobre el grip nunca entra en el trigger Radix y no abre el
 * menú (el clic normal sobre la tarjeta sí lo abre).
 *
 * Usa pointer capture para seguir el puntero. La limpieza (release + reset)
 * ocurre ANTES de invocar `onDrop`, y hay `onPointerCancel` para no dejar el
 * "fantasma" visual pegado si el navegador interrumpe el gesto. `onDrop` se
 * llama fuera del updater de estado (seguro en StrictMode).
 */
export function useEventDrag(
  enabled: boolean,
  onDrop: (
    ev: SchedulerEvent,
    clientX: number,
    clientY: number,
    dx: number,
    dy: number,
  ) => void,
) {
  const [drag, setDrag] = useState<DragVisual | null>(null);
  const evRef = useRef<SchedulerEvent | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const reset = useCallback((el?: HTMLElement | null, pointerId?: number) => {
    if (el && pointerId !== undefined) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* noop */
      }
    }
    startRef.current = null;
    evRef.current = null;
    movedRef.current = false;
    setDrag(null);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, ev: SchedulerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation(); // no abrir el menú contextual del evento
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      evRef.current = ev;
      startRef.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;
      setDrag({ id: ev.appointment.id, dx: 0, dy: 0 });
    },
    [enabled],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
    }
    setDrag((prev) => (prev ? { ...prev, dx, dy } : prev));
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = startRef.current;
      const ev = evRef.current;
      const moved = movedRef.current;
      const x = e.clientX;
      const y = e.clientY;
      // Limpia (release + reset) ANTES de onDrop para que un throw en onDrop
      // no deje la captura o el fantasma visual colgados.
      reset(e.currentTarget as HTMLElement, e.pointerId);
      if (s && ev && moved) {
        onDrop(ev, x, y, x - s.x, y - s.y);
      }
    },
    [onDrop, reset],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      reset(e.currentTarget as HTMLElement, e.pointerId);
    },
    [reset],
  );

  return { drag, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
