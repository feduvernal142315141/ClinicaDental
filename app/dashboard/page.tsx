"use client";

import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";
import { useDashboardSummary } from "@/lib/hooks/dashboard/use-dashboard-summary";
import { Button, Input } from "@/components/ui";
import { Spin, Alert } from "antd";
import { RefreshCw } from "lucide-react";

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

  const today = toIsoDate(new Date());
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

  const updateDate = (key: "from" | "to", value: string) => {
    const next = {
      from: selectedFrom,
      to: selectedTo || today,
      [key]: value,
    };
    if (next.from && next.to) {
      updatePeriod(next);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spin size="large" description="Cargando dashboard..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert
        type="error"
        message="Error al cargar el dashboard"
        description={
          error ?? "No se pudo obtener la información de la clínica."
        }
        showIcon
      />
    );
  }

  if (!data) {
    return (
      <Alert
        type="warning"
        message="Dashboard sin datos"
        description="No se pudo obtener la información de la clínica."
        showIcon
      />
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert
          type="warning"
          message="No se pudo actualizar el dashboard"
          description={error}
          showIcon
        />
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Estado operativo de la clínica basado en citas reales.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={
                selectedRange(selectedFrom, selectedTo, 6)
                  ? "default"
                  : "outline"
              }
              size="sm"
              disabled={loading}
              onClick={() => setQuickRange(6)}
            >
              6M
            </Button>
            <Button
              type="button"
              variant={
                selectedRange(selectedFrom, selectedTo, 12)
                  ? "default"
                  : "outline"
              }
              size="sm"
              disabled={loading}
              onClick={() => setQuickRange(12)}
            >
              12M
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={setYearToDate}
            >
              Año actual
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Desde
              <Input
                type="date"
                value={selectedFrom}
                disabled={loading}
                onChange={(event) => updateDate("from", event.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Hasta
              <Input
                type="date"
                value={selectedTo}
                max={today}
                disabled={loading}
                onChange={(event) => updateDate("to", event.target.value)}
              />
            </label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={loading}
            onClick={refresh}
            aria-label="Actualizar dashboard"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </Button>
        </div>
      </div>
      <OverviewSection data={data} />
      <ProductivitySection data={data} />
      <PatientsSection data={data} />
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
