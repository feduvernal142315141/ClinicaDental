"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  Sparkles,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { AuthParticles } from "./auth-particles";

interface AuthShellProps {
  children: ReactNode;
  /** Muestra el panel de marca lateral (lg+). Default true. */
  showBrandPanel?: boolean;
  /** Fondo calmado: partículas al 40% + aurora atenuada + vignette radial. */
  calm?: boolean;
}

/**
 * AuthShell — lienzo de las vistas de seguridad (2026).
 * Fondo: aurora de gradientes (blur) + campo de partículas + rejilla tenue.
 * Layout: panel de marca bento (lg+) o tarjeta centrada única (tech-minimal).
 * Decorativo y accesible (aria-hidden en capas de fondo, reduce-motion friendly).
 */
export function AuthShell({
  children,
  showBrandPanel = true,
  calm = false,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-canvas">
      {/* Aurora de gradientes */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          calm && "opacity-55",
        )}
      >
        <div className="auth-aurora-blob absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-brand/25 blur-[130px]" />
        <div className="auth-aurora-blob absolute -right-32 top-1/4 h-[34rem] w-[34rem] rounded-full bg-info/20 blur-[130px] [animation-delay:-6s]" />
        <div className="auth-aurora-blob absolute -bottom-48 left-1/3 h-[38rem] w-[38rem] rounded-full bg-brand-strong/20 blur-[140px] [animation-delay:-11s]" />
      </div>

      {/* Partículas a la deriva (reactivas al cursor) */}
      <AuthParticles
        intensity={calm ? 0.7 : 1}
        className="absolute inset-0 h-full w-full"
      />

      {/* Rejilla muy tenue */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--hairline)/0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--hairline)/0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Vignette radial para destacar la tarjeta (modo calmado) */}
      {calm ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 42%, rgb(var(--canvas)/0.45) 100%)",
          }}
        />
      ) : null}

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
        {showBrandPanel ? (
          <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
            <AuthBrandPanel />
            <div className="flex w-full justify-center lg:justify-end">
              {children}
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-center">{children}</div>
        )}
      </div>
    </main>
  );
}

const FEATURES = [
  { icon: CalendarDays, label: "Agenda inteligente", desc: "Citas y disponibilidad en tiempo real" },
  { icon: Stethoscope, label: "Odontograma digital", desc: "Diagnóstico por superficie y plan" },
  { icon: ClipboardList, label: "Historia clínica", desc: "Trazable y por visita" },
] as const;

function AuthBrandPanel() {
  const { name: clinicName, logoUrl } = useClinicBranding();

  return (
    <section className="relative hidden lg:block animate-auth-rise">
      {/* Tiles decorativos flotantes */}
      <div
        aria-hidden
        className="animate-auth-float absolute -right-6 -top-8 h-20 w-20 rounded-bento border border-hairline bg-surface/60 backdrop-blur-md [animation-delay:-3s]"
      />
      <div
        aria-hidden
        className="animate-auth-float absolute -left-8 bottom-10 h-14 w-14 rounded-2xl border border-hairline bg-surface/50 backdrop-blur-md"
      />

      <div className="relative rounded-bento border border-hairline bg-surface/55 p-8 shadow-sm backdrop-blur-xl xl:p-10">
        {/* Logo orb: imagen de la clínica si existe, si no el ícono por defecto */}
        <div className="relative inline-flex">
          <span className="animate-auth-pulse-ring absolute inset-0 rounded-2xl bg-brand/40" />
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo de ${clinicName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Sparkles className="h-7 w-7" />
            )}
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink xl:text-4xl">
          {clinicName}
        </h1>
        <p className="mt-2 max-w-sm text-balance text-subtle">
          La plataforma 2026 para gestionar tu clínica dental: citas, pacientes,
          odontograma e historia clínica en un solo lugar.
        </p>

        <div className="mt-8 space-y-3">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-elevated/60 p-3 transition-colors hover:bg-hover"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{f.label}</p>
                <p className="truncate text-xs text-subtle">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-subtle">
          <ShieldCheck className="h-4 w-4 text-brand" />
          Acceso protegido con verificación en dos pasos
        </div>
      </div>
    </section>
  );
}
