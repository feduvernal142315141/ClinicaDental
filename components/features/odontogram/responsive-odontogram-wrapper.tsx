"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, MoveHorizontal, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils/utils";

/** Margen interior del lienzo al calcular el encaje (px por lado) */
const CANVAS_PADDING = 12;
/** Tope del encaje automático: en monitores grandes no ampliamos más que esto */
const DEFAULT_MAX_FIT = 1.5;
/** Cuánto se permite arrastrar el contenido fuera del contenedor (fracción del contenedor) */
const PAN_SLACK = 0.25;
/** Desplazamiento por pulsación de flecha (px de pantalla) */
const ARROW_STEP = 50;
const WHEEL_ZOOM_STEP = 1.15;
const BUTTON_ZOOM_STEP = 1.25;
/** Umbral para distinguir un arrastre de navegación de un clic sobre un diente */
const DRAG_THRESHOLD = 3;
/** Marca los controles flotantes: el lienzo ignora sus eventos de rueda/puntero */
const UI_SELECTOR = "[data-canvas-ui]";

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface ResponsiveOdontogramWrapperProps {
  children: React.ReactNode;
  /** Controles flotantes sobre el lienzo (ej. leyenda); el wrapper los posiciona abajo-izquierda y los excluye del zoom */
  overlay?: React.ReactNode;
  /** Tamaño asumido antes de la primera medición, solo para evitar un salto inicial */
  fallbackWidth?: number;
  fallbackHeight?: number;
  /** Límites del zoom manual del usuario */
  minScale?: number;
  maxScale?: number;
  /** Tope del encaje automático (no limita el zoom manual) */
  maxFitScale?: number;
}

/**
 * Lienzo interactivo del Odontograma.
 *
 * Mide el contenido real (no asume un tamaño fijo) y lo encaja en el espacio
 * disponible. Sobre eso ofrece zoom anclado al cursor, arrastre para navegar,
 * pellizco en pantallas táctiles y atajos de teclado cuando el lienzo tiene
 * el foco.
 *
 * Convención de rueda (estilo Figma): Ctrl/⌘ + rueda hace zoom; la rueda sola
 * solo navega el lienzo cuando hay contenido fuera de vista y, si todo cabe,
 * se deja pasar para que la página siga scrolleando con normalidad.
 */
export function ResponsiveOdontogramWrapper({
  children,
  overlay,
  fallbackWidth = 872,
  fallbackHeight = 520,
  minScale = 0.35,
  maxScale = 3,
  maxFitScale = DEFAULT_MAX_FIT,
}: ResponsiveOdontogramWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isManual, setIsManualState] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Espejo en refs: los manejadores de puntero/rueda necesitan el valor actual
  // sin re-suscribirse ni arrastrar closures obsoletos.
  const scaleRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const fitRef = useRef(1);
  const isManualRef = useRef(false);
  /** Medidas de layout (no afectadas por el transform) */
  const sizeRef = useRef({
    cw: 0,
    ch: 0,
    w: fallbackWidth,
    h: fallbackHeight,
  });

  // Punteros activos: 1 = arrastre, 2 = pellizco
  const pointersRef = useRef(new Map<number, Point>());
  const dragRef = useRef<{ start: Point; startPan: Point } | null>(null);
  const pinchRef = useRef<{ distance: number } | null>(null);
  const capturedRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  const setIsManual = useCallback((value: boolean) => {
    isManualRef.current = value;
    setIsManualState(value);
  }, []);

  const zoomBounds = useCallback(() => {
    const fit = fitRef.current;
    return {
      min: Math.min(minScale, fit),
      max: Math.max(maxScale, fit),
    };
  }, [minScale, maxScale]);

  /** Impide que el contenido se arrastre completamente fuera de vista */
  const clampPan = useCallback((next: Point, atScale: number): Point => {
    const { cw, ch, w, h } = sizeRef.current;
    const limitX = Math.max(0, (w * atScale - cw) / 2) + cw * PAN_SLACK;
    const limitY = Math.max(0, (h * atScale - ch) / 2) + ch * PAN_SLACK;
    return {
      x: clamp(next.x, -limitX, limitX),
      y: clamp(next.y, -limitY, limitY),
    };
  }, []);

  const setView = useCallback((nextScale: number, nextPan: Point) => {
    scaleRef.current = nextScale;
    panRef.current = nextPan;
    setScale(nextScale);
    setPan(nextPan);
  }, []);

  /**
   * Zoom manteniendo fijo el punto bajo el cursor.
   * `anchor` va en píxeles relativos al centro del contenedor.
   */
  const applyZoom = useCallback(
    (factor: number, anchor: Point = { x: 0, y: 0 }) => {
      const prev = scaleRef.current;
      const { min, max } = zoomBounds();
      const next = clamp(prev * factor, min, max);
      if (next === prev) return;

      const ratio = next / prev;
      const current = panRef.current;
      const nextPan = {
        x: anchor.x - (anchor.x - current.x) * ratio,
        y: anchor.y - (anchor.y - current.y) * ratio,
      };
      setIsManual(true);
      setView(next, clampPan(nextPan, next));
    },
    [clampPan, setIsManual, setView, zoomBounds],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const current = panRef.current;
      setIsManual(true);
      setView(
        scaleRef.current,
        clampPan({ x: current.x + dx, y: current.y + dy }, scaleRef.current),
      );
    },
    [clampPan, setIsManual, setView],
  );

  const resetView = useCallback(() => {
    setIsManual(false);
    setView(fitRef.current, { x: 0, y: 0 });
  }, [setIsManual, setView]);

  /** Encaje por ancho: útil cuando la arcada no se lee bien al encajar completa */
  const fitToWidth = useCallback(() => {
    const { cw, w } = sizeRef.current;
    if (!cw || !w) return;
    const { min, max } = zoomBounds();
    const next = clamp((cw - CANVAS_PADDING * 2) / w, min, max);
    setIsManual(true);
    setView(next, clampPan({ x: 0, y: 0 }, next));
  }, [clampPan, setIsManual, setView, zoomBounds]);

  /** Convierte coordenadas de pantalla a offset respecto al centro del contenedor */
  const anchorFromClient = useCallback((clientX: number, clientY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  }, []);

  // Medición del contenedor y del contenido real (el tamaño del grid depende
  // del tamaño de fuente raíz, así que no puede asumirse en píxeles fijos).
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const w = content.offsetWidth || fallbackWidth;
      const h = content.offsetHeight || fallbackHeight;
      sizeRef.current = { cw, ch, w, h };

      const availableWidth = Math.max(100, cw - CANVAS_PADDING * 2);
      const availableHeight = Math.max(100, ch - CANVAS_PADDING * 2);
      const raw = Math.min(availableWidth / w, availableHeight / h);
      const fit = Number(clamp(raw, minScale, maxFitScale).toFixed(3));

      fitRef.current = fit;
      setFitScale(fit);

      if (isManualRef.current) {
        // Respetamos el zoom del usuario, pero reencuadramos si el resize dejó
        // el contenido fuera de los límites de arrastre.
        setView(scaleRef.current, clampPan(panRef.current, scaleRef.current));
      } else {
        setView(fit, { x: 0, y: 0 });
      }
      setIsReady(true);
    };

    measure();

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(container);
    observer.observe(content);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [clampPan, fallbackHeight, fallbackWidth, maxFitScale, minScale, setView]);

  // Rueda: Ctrl/⌘ hace zoom; sin modificador solo navegamos si hay desborde,
  // de lo contrario dejamos que la página scrollee (no secuestramos la rueda).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(UI_SELECTOR)) return;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
        applyZoom(factor, anchorFromClient(event.clientX, event.clientY));
        return;
      }

      const { cw, ch, w, h } = sizeRef.current;
      const current = scaleRef.current;
      const overflowsX = w * current > cw + 1;
      const overflowsY = h * current > ch + 1;
      if (!overflowsX && !overflowsY) return;

      event.preventDefault();
      // deltaMode: 0 = píxeles, 1 = líneas, 2 = páginas
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? ch || 400 : 1;
      panBy(-event.deltaX * unit, -event.deltaY * unit);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [anchorFromClient, applyZoom, panBy]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.(UI_SELECTOR)) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 1) {
      return;
    }

    // Un arrastre interrumpido no debe descartar el siguiente clic sobre un diente.
    hasDraggedRef.current = false;

    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // La captura se difiere al inicio real del arrastre: capturar aquí
    // redirigiría el `click` al lienzo y el diente no se abriría.

    if (pointers.size === 1) {
      dragRef.current = {
        start: { x: event.clientX, y: event.clientY },
        startPan: { ...panRef.current },
      };
      pinchRef.current = null;
    } else if (pointers.size === 2) {
      dragRef.current = null;
      const [a, b] = Array.from(pointers.values());
      pinchRef.current = { distance: Math.hypot(b.x - a.x, b.y - a.y) };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointers.values());
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const previous = pinchRef.current.distance;
      if (previous > 0 && distance > 0) {
        hasDraggedRef.current = true;
        applyZoom(
          distance / previous,
          anchorFromClient((a.x + b.x) / 2, (a.y + b.y) / 2),
        );
      }
      pinchRef.current = { distance };
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (
      !hasDraggedRef.current &&
      Math.abs(dx) < DRAG_THRESHOLD &&
      Math.abs(dy) < DRAG_THRESHOLD
    ) {
      return;
    }

    // A partir de aquí es navegación: capturamos para no perder el puntero al
    // salir del lienzo.
    if (capturedRef.current === null) {
      capturedRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    hasDraggedRef.current = true;
    setIsDragging(true);
    setIsManual(true);
    setView(
      scaleRef.current,
      clampPan(
        { x: drag.startPan.x + dx, y: drag.startPan.y + dy },
        scaleRef.current,
      ),
    );
  };

  // El fin del gesto se escucha en `window`: si el usuario suelta fuera del
  // lienzo (o el navegador cancela el gesto) el puntero no puede quedar vivo
  // en el mapa, o el siguiente arrastre se interpretaría como pellizco.
  useEffect(() => {
    const finish = (event: PointerEvent) => {
      const pointers = pointersRef.current;
      if (!pointers.delete(event.pointerId)) return;

      if (capturedRef.current === event.pointerId) {
        capturedRef.current = null;
        const container = containerRef.current;
        if (container?.hasPointerCapture(event.pointerId)) {
          container.releasePointerCapture(event.pointerId);
        }
      }
      if (pointers.size < 2) pinchRef.current = null;
      if (pointers.size === 0) {
        dragRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  // El arrastre no debe abrir el diente que quedó bajo el cursor.
  const handleClickCapture = (event: React.MouseEvent) => {
    if (!hasDraggedRef.current) return;
    hasDraggedRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (key === "+" || key === "=") {
      event.preventDefault();
      applyZoom(BUTTON_ZOOM_STEP);
    } else if (key === "-" || key === "_") {
      event.preventDefault();
      applyZoom(1 / BUTTON_ZOOM_STEP);
    } else if (key === "0" || key.toLowerCase() === "r") {
      event.preventDefault();
      resetView();
    } else if (key === "ArrowUp") {
      event.preventDefault();
      panBy(0, ARROW_STEP);
    } else if (key === "ArrowDown") {
      event.preventDefault();
      panBy(0, -ARROW_STEP);
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      panBy(ARROW_STEP, 0);
    } else if (key === "ArrowRight") {
      event.preventDefault();
      panBy(-ARROW_STEP, 0);
    }
  };

  const bounds = zoomBounds();
  const zoomPercentage = Math.round((scale / (fitScale || 1)) * 100);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label="Lienzo del odontograma. Use Ctrl y la rueda para acercar, arrastre para desplazar."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex w-full min-h-0 flex-1 items-center justify-center overflow-hidden outline-none select-none",
        "rounded-bento focus-visible:ring-2 focus-visible:ring-brand/40",
        isDragging
          ? "cursor-grabbing"
          : scale > fitScale * 1.02
            ? "cursor-grab"
            : "cursor-default",
      )}
      style={{ minHeight: "280px", touchAction: "none" }}
    >
      {/* Controles de navegación (fuera del zoom y del arrastre).
          `right-20` y no `right-4`: el FAB de feedback ocupa fijo la esquina
          inferior derecha en TODA pantalla autenticada, y a `right-4` se comía
          el botón de ajuste de esta barra. */}
      <div
        data-canvas-ui
        className="absolute bottom-4 right-20 z-20 flex items-center gap-1 rounded-full border border-border/70 bg-surface/90 px-3 py-1.5 text-xs text-ink shadow-lg backdrop-blur-md transition-all hover:bg-surface hover:shadow-xl"
      >
        <button
          onClick={() => applyZoom(1 / BUTTON_ZOOM_STEP)}
          disabled={scale <= bounds.min}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-subtle/80 hover:text-ink disabled:opacity-40"
          title="Alejar (atajo: tecla −)"
          type="button"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          onClick={resetView}
          className={cn(
            "min-w-[3.5rem] rounded-md px-2 py-0.5 text-center font-mono font-medium transition-colors",
            isManual
              ? "bg-brand/10 font-bold text-brand hover:bg-brand/20"
              : "bg-subtle/60 text-ink hover:bg-subtle",
          )}
          title="Ajustar a pantalla — 100% significa que el odontograma completo cabe en el área visible (atajo: tecla 0 o R)"
          type="button"
        >
          {zoomPercentage}%
        </button>

        <button
          onClick={() => applyZoom(BUTTON_ZOOM_STEP)}
          disabled={scale >= bounds.max}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-subtle/80 hover:text-ink disabled:opacity-40"
          title="Acercar (atajo: tecla +)"
          type="button"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border/60" />

        <button
          onClick={fitToWidth}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-subtle/80 hover:text-ink"
          title="Ajustar al ancho (amplía las arcadas y permite desplazarse en vertical)"
          type="button"
        >
          <MoveHorizontal className="h-4 w-4" />
        </button>

        <div
          className="cursor-help rounded-full p-1.5 text-muted-foreground transition-colors hover:text-ink"
          title="Navegación del lienzo:&#10;• Ctrl/⌘ + rueda: acercar y alejar&#10;• Pellizco: acercar y alejar en pantalla táctil&#10;• Arrastrar: mover el lienzo&#10;• Teclas + − 0 R y flechas (con el lienzo enfocado)"
        >
          <Keyboard className="h-4 w-4" />
        </div>
      </div>

      {/* Controles flotantes del anfitrión (leyenda), fuera del zoom */}
      {overlay && (
        <div data-canvas-ui className="absolute bottom-4 left-4 z-30">
          {overlay}
        </div>
      )}

      {/* Contenido transformado */}
      <div
        ref={contentRef}
        className={cn(
          "absolute top-1/2 left-1/2 w-max origin-center",
          !isDragging && "transition-transform duration-100 ease-out",
        )}
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          willChange: "transform",
          visibility: isReady ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
