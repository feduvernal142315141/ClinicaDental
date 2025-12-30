"use client";

import { useState, useEffect, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";

export interface CarouselItem {
  id: string | number;
  content: ReactNode;
}

export interface CarouselProps {
  items: CarouselItem[];
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
  controlsClassName?: string;
  indicatorClassName?: string;
  activeIndicatorClassName?: string;
  overlay?: ReactNode;
}

export function Carousel({
  items,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  className,
  controlsClassName,
  indicatorClassName,
  activeIndicatorClassName,
  overlay,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (autoPlayInterval <= 0 || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlayInterval, items.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (items.length === 0) {
    return <div className={cn("w-full h-full bg-gray-200", className)} />;
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Contenido del slide actual */}
      <div className="w-full h-full transition-opacity duration-900 ease-in-out">
        {items[currentIndex].content}
      </div>

      {/* Overlay opcional */}
      {overlay && <div className="absolute inset-0 z-10">{overlay}</div>}

      {/* Controles de navegación */}
      {showControls && items.length > 1 && (
        <>
          <Button
            onClick={goToPrevious}
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-20",
              "bg-white/20 backdrop-blur-sm hover:bg-white/30",
              "rounded-full p-2 transition-colors",
              controlsClassName
            )}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>
          <Button
            onClick={goToNext}
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-20",
              "bg-white/20 backdrop-blur-sm hover:bg-white/30",
              "rounded-full p-2 transition-colors",
              controlsClassName
            )}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>
        </>
      )}

      {/* Indicadores */}
      {showIndicators && items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {items.map((item, index) => (
            <Button
              key={item.id}
              onClick={() => goToSlide(index)}
              type="text"
              htmlType="button"
              className={cn(
                "w-3 h-3 min-w-0 p-0 rounded-full transition-colors",
                index === currentIndex
                  ? activeIndicatorClassName || "bg-white"
                  : indicatorClassName || "bg-white/50"
              )}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
