"use client";

import { useEffect, useRef, useState } from "react";
import {
  createEmptySnapshot,
  OdontogramStoreProvider,
  type OdontogramModuleProps,
  useOdontogramStoreApi,
} from "@/lib/odontogram/store";
import { OdontogramModule as OdontogramModuleView } from "@/components/odontogram/odontogram-module";

function OdontogramModuleRuntime({
  patientId,
  clinicId,
  adapter,
  initialTab,
  onChange,
  onError,
}: Omit<OdontogramModuleProps, "readOnly">) {
  const storeApi = useOdontogramStoreApi();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      <OdontogramModuleView initialTab={initialTab} />
    </div>
  );
}

export function OdontogramModule({
  patientId,
  clinicId,
  adapter,
  readOnly = false,
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
        initialTab={initialTab}
        onChange={onChange}
        onError={onError}
      />
    </OdontogramStoreProvider>
  );
}
