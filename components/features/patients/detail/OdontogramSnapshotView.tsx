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
  /**
   * Moneda de la clínica (código ISO de `settings.currency`). La resuelve el
   * padre UNA vez y la propaga: este componente se monta varias veces por
   * pantalla (comparación antes/después) y `useClinicGeneralSettings` no
   * cachea, así que leerlo aquí dispararía un GET por instancia. Sin ella el
   * store cae a su default y el mismo importe se pinta en dólares mientras el
   * odontograma vivo lo pinta en la moneda real.
   */
  currency?: string;
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
  currency,
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
      currency={currency}
      showHeader={false}
      initialTab="odontogram"
    />
  );
}
