"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { OdontogramSnapshotView } from "./OdontogramSnapshotView";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import type { OdontogramVisitSnapshots } from "@/lib/entity/odontogram";

interface OdontogramVisitComparisonProps {
  patientId: string;
  clinicId?: string;
  snapshots: OdontogramVisitSnapshots;
}

function Panel({
  title,
  badgeClass,
  caption,
  children,
}: {
  title: string;
  badgeClass: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-hairline bg-elevated p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={badgeClass}>
          {title}
        </Badge>
        {caption && (
          <span className="text-[10px] text-muted-foreground">{caption}</span>
        )}
      </div>
      <div className="relative h-64 overflow-hidden rounded-lg bg-surface">
        {children}
      </div>
    </div>
  );
}

function formatStamp(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleString("es-ES");
  } catch {
    return undefined;
  }
}

/**
 * Host wrapper: comparativo ANTES/DESPUÉS del odontograma de una visita.
 * Reutiliza el render solo-lectura del módulo (OdontogramSnapshotView).
 */
export function OdontogramVisitComparison({
  patientId,
  clinicId,
  snapshots,
}: OdontogramVisitComparisonProps) {
  const { start, finalSnapshot } = snapshots;
  // Se resuelve UNA vez aquí y se propaga a los paneles: los importes del
  // snapshot histórico deben leerse en la misma moneda que el odontograma
  // vivo, o el mismo diente muestra dos símbolos distintos según por dónde
  // se entre.
  const { settings } = useClinicGeneralSettings();
  const currency =
    settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  if (!start && !finalSnapshot) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Sin odontograma registrado para esta visita
      </p>
    );
  }

  // Cuando solo existe un lado (consultas previas a la captura 'start', o sin
  // guardado final), mostramos el snapshot disponible sin forzar el comparativo.
  const onlyOne = !start || !finalSnapshot;

  if (onlyOne) {
    const single = start ?? finalSnapshot!;
    const isStart = !!start;
    return (
      <Panel
        title={isStart ? "Estado al iniciar" : "Estado final"}
        badgeClass={
          isStart
            ? "bg-slate-500/15 text-slate-600 border-slate-400/25 dark:text-slate-300"
            : "bg-emerald-500/15 text-emerald-600 border-emerald-400/25 dark:text-emerald-300"
        }
        caption={formatStamp(single.createdAt)}
      >
        <OdontogramSnapshotView
          patientId={patientId}
          clinicId={clinicId}
          currency={currency}
          state={single.state}
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <Panel
        title="Antes (inicio)"
        badgeClass="bg-slate-500/15 text-slate-600 border-slate-400/25 dark:text-slate-300"
        caption={formatStamp(start.createdAt)}
      >
        <OdontogramSnapshotView
          patientId={patientId}
          clinicId={clinicId}
          currency={currency}
          state={start.state}
        />
      </Panel>

      <div className="flex items-center justify-center lg:flex-col">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <Panel
        title="Después (final)"
        badgeClass="bg-emerald-500/15 text-emerald-600 border-emerald-400/25 dark:text-emerald-300"
        caption={formatStamp(finalSnapshot.createdAt)}
      >
        <OdontogramSnapshotView
          patientId={patientId}
          clinicId={clinicId}
          currency={currency}
          state={finalSnapshot.state}
        />
      </Panel>
    </div>
  );
}
