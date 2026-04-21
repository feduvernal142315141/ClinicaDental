"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { FlagOutlined } from "@ant-design/icons";
import {
  createEmptySnapshot,
  OdontogramStoreProvider,
  type OdontogramModuleProps,
  useOdontogramStore,
  useOdontogramStoreApi,
} from "@/lib/odontogram/store";
import { OdontogramModule as OdontogramModuleView } from "@/components/odontogram/odontogram-module";
import { FinalizarCitaModal } from "@/components/features/odontogram/finalize-appointment-modal";

function OdontogramModuleRuntime({
  patientId,
  clinicId,
  adapter,
  showHeader = true,
  initialTab,
  onChange,
  onError,
}: Omit<OdontogramModuleProps, "readOnly">) {
  const storeApi = useOdontogramStoreApi();
  const readOnly = useOdontogramStore((state) => state.readOnly);
  const visitId = useOdontogramStore((state) => state.metadata.visitId);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const hydratingRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    hydratingRef.current = true;
    setIsLoading(true);

    void (async () => {
      try {
        const snapshot =
          (await adapter.load(patientId, clinicId)) ??
          createEmptySnapshot({ patientId, clinicId });

        if (!active) return;

        storeApi.getState().replaceSnapshot(snapshot);
        setLoadError(null);
      } catch (error) {
        if (!active) return;

        storeApi
          .getState()
          .replaceSnapshot(createEmptySnapshot({ patientId, clinicId }));
        setLoadError("No se pudo cargar el odontograma.");
        onError?.(error);
      } finally {
        if (!active) return;
        hydratingRef.current = false;
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [adapter, clinicId, onError, patientId, storeApi]);

  useEffect(() => {
    const unsubscribe = storeApi.subscribe((state) => {
      if (hydratingRef.current) return;

      const snapshot = state.getSnapshot();
      onChange?.(snapshot);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void adapter.save(patientId, snapshot, clinicId).catch((error) => {
          setLoadError("No se pudo sincronizar el odontograma.");
          onError?.(error);
        });
      }, 300);
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [adapter, clinicId, onChange, onError, patientId, storeApi]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Cargando odontograma...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {visitId && !readOnly ? (
        <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-green-800">Cita activa</p>
            <p className="text-xs text-green-700">
              Registra procedimientos realizados y finaliza la cita cuando
              termines.
            </p>
          </div>
          <Button
            type="primary"
            icon={<FlagOutlined />}
            style={{ background: "#22c55e", borderColor: "#22c55e" }}
            onClick={() => setFinalizeOpen(true)}
          >
            Finalizar cita
          </Button>
        </div>
      ) : null}

      <OdontogramModuleView initialTab={initialTab} showHeader={showHeader} />

      {visitId && patientId && clinicId ? (
        <FinalizarCitaModal
          open={finalizeOpen}
          onClose={() => setFinalizeOpen(false)}
          visitId={visitId}
          patientId={patientId}
          clinicId={clinicId}
          adapter={adapter}
        />
      ) : null}
    </div>
  );
}

export function OdontogramModule({
  patientId,
  clinicId,
  adapter,
  readOnly = false,
  showHeader = true,
  initialTab = "odontogram",
  onChange,
  onError,
}: OdontogramModuleProps) {
  return (
    <OdontogramStoreProvider
      key={`${clinicId ?? "default"}:${patientId}`}
      patientId={patientId}
      clinicId={clinicId}
      readOnly={readOnly}
    >
      <OdontogramModuleRuntime
        patientId={patientId}
        clinicId={clinicId}
        adapter={adapter}
        showHeader={showHeader}
        initialTab={initialTab}
        onChange={onChange}
        onError={onError}
      />
    </OdontogramStoreProvider>
  );
}
