"use client";

import { useMemo, useEffect } from "react";
import { App, Badge } from "antd";
import { OdontogramModule, createApiOdontogramAdapter, createHistoricOdontogramAdapter } from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { RotateCcw } from "lucide-react";

interface PatientOdontogramPanelProps {
  patient: {
    id: string;
    clinicId?: string;
  };
  activeAppointmentId?: string;
  historicVisitId?: string;
  onClearHistoric?: () => void;
}

export function PatientOdontogramPanel({
  patient,
  activeAppointmentId,
  historicVisitId,
  onClearHistoric,
}: PatientOdontogramPanelProps) {
  const { message } = App.useApp();
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();

  const clinicId = patient.clinicId ?? "";

  const { snapshot: historicSnapshot, loading: historicLoading, load: loadHistoric } =
    useOdontogramByVisit(historicVisitId);

  useEffect(() => {
    if (historicVisitId) {
      loadHistoric(historicVisitId);
    }
  }, [historicVisitId, loadHistoric]);

  const apiAdapter = useMemo(
    () =>
      createApiOdontogramAdapter({
        authorId: user?.id ?? "",
        clinicId,
        visitId: activeAppointmentId,
      }),
    [user?.id, clinicId, activeAppointmentId],
  );

  const historicAdapter = useMemo(() => {
    if (!historicSnapshot) return null;
    return createHistoricOdontogramAdapter(historicSnapshot.state);
  }, [historicSnapshot]);

  const isHistoricMode = !!historicVisitId;
  const readOnly = isHistoricMode || !(isAdmin || can("patients", PermissionAction.EDIT));

  // While loading historic snapshot, show nothing or loading
  if (isHistoricMode && historicLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Cargando vista histórica...
      </div>
    );
  }

  const adapter = isHistoricMode && historicAdapter ? historicAdapter : apiAdapter;

  return (
    <div className="flex flex-col h-full">
      {/* Historic banner */}
      {isHistoricMode && historicSnapshot && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2">
          <Badge
            color="gold"
            text={`Vista histórica · ${new Date(historicSnapshot.createdAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onClearHistoric}
            className="h-7 text-xs flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Volver al actual
          </Button>
        </div>
      )}

      {isHistoricMode && !historicSnapshot && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2">
          <Badge color="gold" text="Vista histórica — Sin datos disponibles" />
          <Button
            variant="outline"
            size="sm"
            onClick={onClearHistoric}
            className="h-7 text-xs flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Volver al actual
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <OdontogramModule
          patientId={patient.id}
          clinicId={clinicId}
          adapter={adapter}
          readOnly={readOnly}
          showHeader={false}
          initialTab="odontogram"
          onError={() => {
            message.error("No se pudo sincronizar el odontograma del paciente");
          }}
        />
      </div>
    </div>
  );
}
