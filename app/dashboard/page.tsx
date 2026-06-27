"use client";

import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";
import { useDashboardSummary } from "@/lib/hooks/dashboard/use-dashboard-summary";
import { isSessionExpired } from "@/lib/services/apiConfig";
import { cn } from "@/lib/utils/utils";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/atomic/feedback/alert";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { DateRangePicker } from "@/components/ui/controls/date-range-picker";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { formatClinicTimezone } from "@/lib/utils/clinic-regional-format";

const OverviewSection = dynamic(
  () =>
    import("@/components/dashboard/overview-section").then(
      (mod) => mod.OverviewSection,
    ),
  { loading: () => <LazyLoadingFallback /> },
);

const ProductivitySection = dynamic(
  () =>
    import("@/components/dashboard/productivity-section").then(
      (mod) => mod.ProductivitySection,
    ),
  { loading: () => <LazyLoadingFallback /> },
);

const PatientsSection = dynamic(
  () =>
    import("@/components/dashboard/patients-section").then(
      (mod) => mod.PatientsSection,
    ),
  { loading: () => <LazyLoadingFallback /> },
);

export default function DashboardPage() {
  const { data, loading, error, params, refresh, updatePeriod } =
    useDashboardSummary();
  const { settings, loading: loadingSettings, error: settingsError, reload } =
    useClinicGeneralSettings();

  const currency = settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;
  const timezone = settings?.timezone ?? DEFAULT_CLINIC_GENERAL_SETTINGS.timezone;

  const selectedFrom = params?.from ?? data?.period.from ?? "";
  const selectedTo = params?.to ?? data?.period.to ?? "";

  const setQuickRange = (months: number) => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    updatePeriod({ from: toIsoDate(from), to: toIsoDate(now) });
  };

  const setYearToDate = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    updatePeriod({ from: toIsoDate(from), to: toIsoDate(now) });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner message="Cargando dashboard..." />
      </div>
    );
  }

  if (error && !data) {
    // Si la sesión expiró, el modal global y la redirección se encargan:
    // no mostrar también el error inline del dashboard.
    if (isSessionExpired()) {
      return (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message="Redirigiendo al inicio de sesión..." />
        </div>
      );
    }
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Error al cargar el dashboard</AlertTitle>
        <AlertDescription>
          {error ?? "No se pudo obtener la información de la clínica."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle />
        <AlertTitle>Dashboard sin datos</AlertTitle>
        <AlertDescription>
          No se pudo obtener la información de la clínica.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>No se pudo actualizar el dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Toolbar (sticky, sobre canvas, estilo 2026) ─────────────── */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-hairline bg-canvas/80 px-4 py-4 backdrop-blur-md lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Dashboard
              </h1>
              <span className="inline-flex items-center rounded-full border border-hairline bg-elevated px-2 py-0.5 text-xs font-medium text-subtle">
                {currency}
              </span>
              <span className="inline-flex items-center rounded-full border border-hairline bg-elevated px-2 py-0.5 text-xs font-medium text-subtle">
                {formatClinicTimezone(timezone)}
              </span>
              {settingsError && (
                <span className="text-xs text-amber-600">
                  Configuración regional por defecto
                </span>
              )}
            </div>
            <p className="text-sm text-subtle">
              Estado operativo de la clínica basado en citas reales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets segmentados */}
            <div className="inline-flex items-center rounded-xl border border-hairline bg-elevated p-0.5 text-sm">
              {[
                { label: "6M", active: selectedRange(selectedFrom, selectedTo, 6), onClick: () => setQuickRange(6) },
                { label: "12M", active: selectedRange(selectedFrom, selectedTo, 12), onClick: () => setQuickRange(12) },
                { label: "Año actual", active: isYearToDate(selectedFrom, selectedTo), onClick: setYearToDate },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={loading}
                  onClick={p.onClick}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-50",
                    p.active
                      ? "bg-brand text-white shadow-sm"
                      : "text-subtle hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Rango de fechas (control corporativo, hora local) */}
            <DateRangePicker
              from={selectedFrom}
              to={selectedTo}
              disabled={loading}
              onChange={({ from, to }) => {
                if (from && to) updatePeriod({ from, to });
              }}
            />

            {/* Refrescar */}
            <button
              type="button"
              disabled={loading || loadingSettings}
              onClick={() => {
                refresh();
                reload();
              }}
              aria-label="Actualizar dashboard"
              className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-elevated text-subtle transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (loading || loadingSettings) && "animate-spin",
                )}
              />
            </button>
          </div>
        </div>
        {loadingSettings && (
          <p className="mt-2 text-xs text-subtle">
            Sincronizando configuración regional…
          </p>
        )}
      </div>

      <OverviewSection data={data} currency={currency} />
      <ProductivitySection data={data} />
      <PatientsSection data={data} currency={currency} />
    </div>
  );
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function selectedRange(from: string, to: string, months: number): boolean {
  if (!from || !to) return false;
  const now = new Date();
  const expectedFrom = new Date(
    now.getFullYear(),
    now.getMonth() - months + 1,
    1,
  );
  return from === toIsoDate(expectedFrom) && to === toIsoDate(now);
}

function isYearToDate(from: string, to: string): boolean {
  if (!from || !to) return false;
  const now = new Date();
  const expectedFrom = new Date(now.getFullYear(), 0, 1);
  return from === toIsoDate(expectedFrom) && to === toIsoDate(now);
}
