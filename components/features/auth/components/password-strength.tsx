"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";

const REQUIREMENTS: { label: string; test: (pwd: string) => boolean }[] = [
  { label: "Entre 8 y 20 caracteres", test: (p) => p.length >= 8 && p.length <= 20 },
  { label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /\d/.test(p) },
  { label: "Un carácter especial", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

/**
 * Indicador de fortaleza de contraseña en estilo Bento (Radix/shadcn, sin antd).
 * Comparte criterios con el flujo de restablecimiento/cambio de contraseña.
 */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const met = REQUIREMENTS.filter((r) => r.test(password));
  const strength = (met.length / REQUIREMENTS.length) * 100;

  let label = "Débil";
  let toneText = "text-rose-500";
  let toneBar = "bg-rose-500";
  if (strength >= 40 && strength < 60) {
    label = "Media";
    toneText = "text-amber-500";
    toneBar = "bg-amber-500";
  } else if (strength >= 60) {
    label = strength >= 80 ? "Excelente" : "Buena";
    toneText = "text-emerald-500";
    toneBar = "bg-emerald-500";
  }

  return (
    <div className="space-y-3 rounded-2xl border border-hairline bg-elevated/60 p-3">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-subtle">Fortaleza de contraseña</span>
          <span className={cn("text-xs font-medium", toneText)}>{label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className={cn("h-full rounded-full transition-all duration-300", toneBar)}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {REQUIREMENTS.map((req) => {
          const ok = req.test(password);
          return (
            <div
              key={req.label}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                ok ? "text-emerald-600" : "text-subtle",
              )}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
              <span className="leading-tight">{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
