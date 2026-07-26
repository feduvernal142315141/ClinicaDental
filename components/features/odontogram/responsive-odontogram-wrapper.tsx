"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface ResponsiveOdontogramWrapperProps {
  children: React.ReactNode;
  /** Elemento flotante sobre el lienzo (ej. Leyenda colapsable) no afectado por el zoom */
  floatingOverlay?: React.ReactNode;
  /** Ancho base intrínseco del grid de dientes en píxeles (default: 872) */
  baseWidth?: number;
  /** Alto base intrínseco del grid de dientes en píxeles (default: 520) */
  baseHeight?: number;
  /** Factor máximo de escala para monitores amplios (default: 3.0) */
  maxScale?: number;
  /** Factor mínimo de escala para proteger la legibilidad en pantallas compactas (default: 0.35) */
  minScale?: number;
}

/**
 * Lienzo interactivo para el Odontograma (Odontogram Canvas).
 * Proporciona escalado dinámico al iniciar, zoom interactivo mediante rueda del mouse,
 * atajos de teclado (+, -, 0, flechas) y una barra de herramientas flotante estilo Bento.
 * Permite además arrastrar el lienzo con el mouse para navegar cómodamente cuando está ampliado.
 */
export function ResponsiveOdontogramWrapper({
  children,
  floatingOverlay,
  baseWidth = 872,
  baseHeight = 520,
  maxScale = 3.0,
  minScale = 0.35,
}: ResponsiveOdontogramWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados de escala y traslación (pan)
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState<boolean>(false);

  // Estado para saber si el usuario ha modificado la vista manualmente
  const [isManual, setIsManualState] = useState<boolean>(false);
  const isManualRef = useRef<boolean>(false);

  const setIsManual = useCallback((val: boolean) => {
    isManualRef.current = val;
    setIsManualState(val);
  }, []);

  // Estados para arrastre (pan con mouse)
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startMouse, setStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  // Estado de foco/hover para atajos de teclado
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Límites de escala calculados en función del encaje
  const minScaleVal = Math.max(minScale, fitScale * 0.5);
  const maxScaleVal = Math.max(maxScale, fitScale * 3.5);

  // Funciones de navegación
  const zoomIn = useCallback(() => {
    setIsManual(true);
    setScale((prev) => Math.min(maxScaleVal, prev * 1.25));
  }, [maxScaleVal, setIsManual]);

  const zoomOut = useCallback(() => {
    setIsManual(true);
    setScale((prev) => Math.max(minScaleVal, prev / 1.25));
  }, [minScaleVal, setIsManual]);

  const resetView = useCallback(() => {
    setIsManual(false);
    setScale(fitScale);
    setPan({ x: 0, y: 0 });
  }, [fitScale, setIsManual]);

  // Cálculo inicial de ajuste a pantalla (Fit to View)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const availableWidth = Math.max(100, rect.width - 24);
      const availableHeight = Math.max(100, rect.height - 24);

      const scaleX = availableWidth / baseWidth;
      const scaleY = availableHeight / baseHeight;

      // Para el ajuste por defecto, aseguramos que la grilla entera quepa en pantalla sin scroll
      let calculatedFit = Math.min(scaleX, scaleY);
      calculatedFit = Math.max(0.35, Math.min(1.5, calculatedFit));

      const roundedFit = Number(calculatedFit.toFixed(3));
      setFitScale(roundedFit);

      // Si el usuario no ha hecho zoom manual, mantenemos la escala en el ajuste perfecto
      if (!isManualRef.current) {
        setScale(roundedFit);
        setPan({ x: 0, y: 0 });
      }
      setIsReady(true);
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateScale();
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [baseWidth, baseHeight]);

  // Rueda del mouse (Zoom y Pan con Trackpad)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey || !e.deltaX) {
        // Zoom con rueda del mouse o gesto de pellizco en trackpad
        const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setScale((prev) => {
          const next = Math.max(minScaleVal, Math.min(maxScaleVal, prev * zoomFactor));
          return next;
        });
        setIsManual(true);
      } else {
        // Desplazamiento horizontal/vertical con gestos de trackpad
        setPan((prev) => ({
          x: prev.x - e.deltaX * 0.8,
          y: prev.y - e.deltaY * 0.8,
        }));
        setIsManual(true);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [minScaleVal, maxScaleVal, setIsManual]);

  // Atajos de teclado cuando el cursor está sobre el lienzo
  useEffect(() => {
    if (!isHovered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input, select o textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "+" || e.key === "=" || (e.ctrlKey && e.key === "+")) {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || (e.ctrlKey && e.key === "-")) {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0" || e.key === "r" || e.key === "R" || e.key === "Escape") {
        e.preventDefault();
        resetView();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y + 50 }));
        setIsManual(true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y - 50 }));
        setIsManual(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x + 50 }));
        setIsManual(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x - 50 }));
        setIsManual(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHovered, zoomIn, zoomOut, resetView, setIsManual]);

  // Manejadores de arrastre con el mouse (Pan Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsMouseDown(true);
    setStartMouse({ x: e.clientX, y: e.clientY });
    setStartPan({ ...pan });
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const dx = e.clientX - startMouse.x;
    const dy = e.clientY - startMouse.y;
    // Si se mueve más de 3 píxeles, es un arrastre de navegación
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
      hasDraggedRef.current = true;
      setIsManual(true);
      setPan({
        x: startPan.x + dx,
        y: startPan.y + dy,
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  // Prevenir que un arrastre del lienzo dispare un clic en un diente
  const handleClickCapture = (e: React.MouseEvent) => {
    if (isDragging || hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  const zoomPercentage = Math.round((scale / fitScale) * 100);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onClickCapture={handleClickCapture}
      className={cn(
        "w-full flex-1 min-h-0 relative flex items-center justify-center overflow-hidden select-none outline-none group",
        isDragging ? "cursor-grabbing" : scale > fitScale * 1.02 ? "cursor-grab" : "cursor-default"
      )}
      style={{ minHeight: isReady ? "280px" : "320px" }}
    >
      {/* Botones Flotantes de Navegación (Bento UI) */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1.5 shadow-lg backdrop-blur-md border border-border/70 text-xs text-ink transition-all hover:bg-surface hover:shadow-xl opacity-90 hover:opacity-100">
        <button
          onClick={zoomOut}
          disabled={scale <= minScaleVal}
          className="p-1.5 rounded-full hover:bg-subtle/80 disabled:opacity-40 transition-colors text-muted-foreground hover:text-ink"
          title="Alejar (Atajo: tecla -)"
          type="button"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          onClick={resetView}
          className={cn(
            "px-2 py-0.5 rounded-md font-mono font-medium transition-colors min-w-[3.5rem] text-center",
            isManual ? "bg-brand/10 text-brand font-bold hover:bg-brand/20" : "bg-subtle/60 hover:bg-subtle text-ink"
          )}
          title="Ajustar a pantalla / Restablecer zoom (Atajo: tecla 0 o R)"
          type="button"
        >
          {zoomPercentage}%
        </button>

        <button
          onClick={zoomIn}
          disabled={scale >= maxScaleVal}
          className="p-1.5 rounded-full hover:bg-subtle/80 disabled:opacity-40 transition-colors text-muted-foreground hover:text-ink"
          title="Acercar (Atajo: tecla +)"
          type="button"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <button
          onClick={resetView}
          className="p-1.5 rounded-full hover:bg-subtle/80 transition-colors text-muted-foreground hover:text-ink"
          title="Ajustar a pantalla completa (Atajo: tecla R)"
          type="button"
        >
          <Maximize className="h-4 w-4" />
        </button>

        <div
          className="p-1.5 rounded-full text-muted-foreground hover:text-ink cursor-help transition-colors"
          title="Navegación del lienzo:&#10;• Rueda del mouse: Acercar y alejar&#10;• Arrastrar con clic: Mover lienzo&#10;• Teclas +, -, 0, R: Zoom y ajuste&#10;• Flechas del teclado: Desplazar vista"
        >
          <Keyboard className="h-4 w-4" />
        </div>
      </div>

      {/* Elementos flotantes sobre el lienzo no afectados por escala (ej. Leyenda colapsable) */}
      {floatingOverlay}

      {/* Contenedor transformado (Escala y Traslación) */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 origin-center",
          !isDragging && "transition-transform duration-100 ease-out"
        )}
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          visibility: isReady ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
