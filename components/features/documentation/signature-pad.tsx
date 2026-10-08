"use client";
import { useId, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";

export function SignaturePad({ onChange, disabled, label }: { onChange: (value: string | undefined) => void; disabled: boolean; label?: string }) {
  const { t } = useI18n();
  const instructionsId = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const moved = useRef(false);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 800 / bounds.width, y: (event.clientY - bounds.top) * 260 / bounds.height };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    context.beginPath(); context.moveTo(p.x, p.y);
    context.strokeStyle = "#111827"; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round";
    // Invalidate any preview as soon as drawing begins.
    onChange(undefined);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const p = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.lineTo(p.x, p.y); context?.stroke(); moved.current = true;
  };
  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (moved.current) onChange(canvas.current?.toDataURL("image/png"));
  };
  return <div className="space-y-2">
    <p id={instructionsId} className="text-sm text-subtle">{t("documentation.drawHint")}</p>
    <canvas ref={canvas} width={800} height={260} aria-label={label ?? t("documentation.draw")} aria-describedby={instructionsId}
      className="w-full touch-none rounded-xl border border-hairline bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />
    <Button variant="outline" disabled={disabled} onClick={() => {
      canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 260);
      drawing.current = false; moved.current = false; onChange(undefined);
    }}>{t("documentation.clearSignature")}</Button>
  </div>;
}
