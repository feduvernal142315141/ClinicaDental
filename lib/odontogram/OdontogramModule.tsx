"use client";

import { useEffect, useRef, useState } from "react";
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
  onSaveStart,
  onSaveSuccess,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: Omit<OdontogramModuleProps, "readOnly">) {
  const storeApi = useOdontogramStoreApi();
  const visitId = useOdontogramStore((state) => state.metadata.visitId);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydratingRef = useRef(true);
  // Integridad: si la carga falla, NO habilitamos el autosave. Evita que una
  // edición posterior persista un snapshot vacío y sobrescriba el odontograma
  // real del paciente (el GET pudo fallar transitoriamente).
  const loadFailedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    hydratingRef.current = true;
    loadFailedRef.current = false;
    setIsLoading(true);

    void (async () => {
      try {
        const snapshot =
          (await adapter.load(patientId, clinicId)) ??
          createEmptySnapshot({ patientId, clinicId });

        if (!active) return;

        storeApi.getState().replaceSnapshot(snapshot);
        loadFailedRef.current = false;
        setLoadError(null);
      } catch (error) {
        if (!active) return;

        // No reemplazamos por un snapshot vacío editable: marcamos el fallo para
        // bloquear el autosave y mostramos el error. Así un estado vacío nunca
        // llega a sobrescribir lo persistido.
        loadFailedRef.current = true;
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
      // No autosave durante la hidratación, en solo-lectura (histórico / visita
      // finalizada / sin cita) NI tras un fallo de carga: evita PUTs no deseados,
      // con visita stale, o que sobrescriban lo persistido con un estado vacío.
      if (hydratingRef.current || state.readOnly || loadFailedRef.current) return;

      const snapshot = state.getSnapshot();
      onChange?.(snapshot);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        onSaveStart?.();
        void adapter
          .save(patientId, snapshot, clinicId)
          .then(() => onSaveSuccess?.())
          .catch((error) => {
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
  }, [
    adapter,
    clinicId,
    onChange,
    onError,
    onSaveStart,
    onSaveSuccess,
    patientId,
    storeApi,
  ]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Cargando odontograma...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 space-y-4">
      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <OdontogramModuleView initialTab={initialTab} showHeader={showHeader} />

      {visitId && patientId && clinicId ? (
        <FinalizarCitaModal
          open={!!finalizeOpen}
          onClose={() => onFinalizeClose?.()}
          visitId={visitId}
          patientId={patientId}
          clinicId={clinicId}
          adapter={adapter}
          onSuccess={onFinalizeSuccess}
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
  onSaveStart,
  onSaveSuccess,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
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
        onSaveStart={onSaveStart}
        onSaveSuccess={onSaveSuccess}
        finalizeOpen={finalizeOpen}
        onFinalizeClose={onFinalizeClose}
        onFinalizeSuccess={onFinalizeSuccess}
      />
    </OdontogramStoreProvider>
  );
}
