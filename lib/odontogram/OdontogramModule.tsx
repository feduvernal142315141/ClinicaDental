"use client";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsultationDocuments } from "@/components/features/odontogram/consultation-documents";
import {
  createEmptySnapshot,
  type OdontogramSnapshot,
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
  dictationAdapter,
  showHeader = true,
  documentationView = false,
  initialTab,
  onChange,
  onError,
  onSaveStart,
  onSaveSuccess,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: Omit<
  OdontogramModuleProps,
  "readOnly" | "currency" | "notation" | "defaultDentition"
>) {
  const { t } = useI18n();
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
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const explicitSaveRef = useRef(false);
  const enqueueSave = useCallback((snapshot: OdontogramSnapshot) => {
    const queued = saveQueueRef.current.catch(() => undefined).then(async () => {
      onSaveStart?.();
      await adapter.save(patientId, snapshot, clinicId);
      setLoadError(null);
      onSaveSuccess?.();
    });
    saveQueueRef.current = queued;
    return queued;
  }, [adapter, patientId, clinicId, onSaveStart, onSaveSuccess]);
  const persist = useCallback(async (transform?: (snapshot: OdontogramSnapshot) => OdontogramSnapshot) => {
    if (loadFailedRef.current || hydratingRef.current || storeApi.getState().readOnly) throw new Error("Odontogram is not editable");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    explicitSaveRef.current = true;
    storeApi.getState().setReadOnly(true);
    try {
      const current = storeApi.getState().getSnapshot();
      const next = transform ? transform(current) : current;
      await enqueueSave(next);
      if (transform) {
        storeApi.getState().replaceSnapshot(next);
        onChange?.(next);
      }
    } finally {
      storeApi.getState().setReadOnly(false);
      explicitSaveRef.current = false;
    }
  }, [enqueueSave, storeApi, onChange]);

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
    const unsubscribe = storeApi.subscribe((state, prev) => {
      // No autosave durante la hidratación, en solo-lectura (histórico / visita
      // finalizada / sin permiso) NI tras un fallo de carga: evita PUTs no deseados,
      // con visita stale, o que sobrescriban lo persistido con un estado vacío.
      if (hydratingRef.current || explicitSaveRef.current || state.readOnly || loadFailedRef.current) return;

      if (
        state.schemaVersion === prev.schemaVersion &&
        state.dentition === prev.dentition &&
        state.teeth === prev.teeth &&
        state.clinicalEvents === prev.clinicalEvents &&
        state.treatmentPlans === prev.treatmentPlans &&
        state.metadata === prev.metadata
      )
        return;

      const snapshot = state.getSnapshot();
      onChange?.(snapshot);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void enqueueSave(snapshot)
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
    enqueueSave,
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

      {visitId && !loadFailedRef.current ? <ConsultationDocuments key={visitId} visitId={visitId} persist={persist} documentationView={documentationView}>
        <OdontogramModuleView initialTab={initialTab} showHeader={showHeader} dictationAdapter={dictationAdapter} />
      </ConsultationDocuments> : documentationView ? <p className="p-6 text-sm text-subtle">{t("consultationDocuments.noVisit")}</p> : <OdontogramModuleView initialTab={initialTab} showHeader={showHeader} dictationAdapter={dictationAdapter} />}

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
  dictationAdapter,
  readOnly = false,
  currency,
  notation,
  defaultDentition,
  showHeader = true,
  documentationView = false,
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
      currency={currency}
      notation={notation}
      defaultDentition={defaultDentition}
    >
      <OdontogramModuleRuntime
        patientId={patientId}
        clinicId={clinicId}
        adapter={adapter}
        dictationAdapter={dictationAdapter}
        documentationView={documentationView}
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
