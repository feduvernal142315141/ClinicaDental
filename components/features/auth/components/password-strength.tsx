"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import {
  PASSWORD_RULES,
  getPasswordStrength,
  type PasswordStrengthLevel,
} from "@/lib/validation/password-policy";

const TONE: Record<PasswordStrengthLevel, { text: string; bar: string }> = {
  weak: { text: "text-rose-500", bar: "bg-rose-500" },
  medium: { text: "text-amber-500", bar: "bg-amber-500" },
  // "Casi lista" sigue en ámbar: todavía falta una regla y no se puede enviar.
  good: { text: "text-amber-500", bar: "bg-amber-500" },
  excellent: { text: "text-emerald-500", bar: "bg-emerald-500" },
};

/**
 * Indicador de fortaleza de contraseña (Bento, sin antd). Las reglas vienen de
 * `lib/validation/password-policy` — las mismas que valida el backend —, así que "Excelente"
 * solo aparece cuando la contraseña cumple las cinco y se puede enviar.
 */
export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const tone = TONE[strength.level];

  return (
    <div className={cn("space-y-3 rounded-2xl border border-hairline bg-elevated/60 p-3", className)}>
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-subtle">Fortaleza de contraseña</span>
          <span className={cn("text-xs font-medium", tone.text)} aria-live="polite">
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className={cn("h-full rounded-full transition-all duration-300", tone.bar)}
            style={{ width: `${strength.percent}%` }}
          />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="Requisitos de la contraseña">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                ok ? "text-emerald-600" : "text-subtle",
              )}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              )}
              <span className="leading-tight">
                <span className="sr-only">{ok ? "Cumple: " : "Falta: "}</span>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
