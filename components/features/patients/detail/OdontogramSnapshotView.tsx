"use client";

import { useMemo } from "react";
import {
  OdontogramModule,
  createHistoricOdontogramAdapter,
} from "@/lib/odontogram";

interface OdontogramSnapshotViewProps {
  patientId: string;
  clinicId?: string;
  /** JSON string of the odontogram snapshot (`{ teeth, clinicalEvents }`). */
  state: string;
}

/**
 * Host wrapper: renderiza un snapshot del odontograma en modo SOLO LECTURA
 * reutilizando el camino oficial del módulo (OdontogramModule + adapter
 * histórico). No accede a internals del módulo.
 */
export function OdontogramSnapshotView({
  patientId,
  clinicId = "",
  state,
}: OdontogramSnapshotViewProps) {
  const adapter = useMemo(
    () => createHistoricOdontogramAdapter(state),
    [state],
  );

  return (
    <OdontogramModule
      patientId={patientId}
      clinicId={clinicId}
      adapter={adapter}
      readOnly
      showHeader={false}
      initialTab="odontogram"
    />
  );
}
