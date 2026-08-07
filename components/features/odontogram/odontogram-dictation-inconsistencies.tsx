"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CircleHelp, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import type {
  OdontogramDictationInconsistency,
  ResolveOdontogramInconsistencyRequest,
} from "@/lib/entity/speech";

export interface OdontogramDictationInconsistencyBatch {
  dictationId: string;
  inconsistencies: OdontogramDictationInconsistency[];
  appliedLocally?: boolean;
}

interface OdontogramDictationInconsistenciesProps {
  batches: OdontogramDictationInconsistencyBatch[];
  readOnly: boolean;
  onResolve: (
    batch: OdontogramDictationInconsistencyBatch,
    resolutions: ResolveOdontogramInconsistencyRequest[],
  ) => void;
  onDismiss: (dictationId: string, inconsistencyId: string) => void;
}

export function OdontogramDictationInconsistencies({
  batches,
  readOnly,
  onResolve,
  onDismiss,
}: OdontogramDictationInconsistenciesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const pendingCount = useMemo(
    () =>
      batches.reduce(
        (total, batch) => total + batch.inconsistencies.length,
        0,
      ),
    [batches],
  );

  if (pendingCount === 0) return null;

  const handleResolve = (batch: OdontogramDictationInconsistencyBatch) => {
    const resolutions = batch.inconsistencies.map((inconsistency) => ({
      inconsistencyId: inconsistency.id,
      candidateId: selections[inconsistency.id],
    }));

    onResolve(batch, resolutions);
  };

  const handleDismiss = (dictationId: string, inconsistencyId: string) => {
    setSelections((current) => {
      const next = { ...current };
      delete next[inconsistencyId];
      return next;
    });
    onDismiss(dictationId, inconsistencyId);
  };

  return (
    <div className="relative z-30 flex justify-end">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-8 items-center gap-2 rounded-full border border-hairline bg-surface/95 px-3 py-1.5 text-left text-xs text-subtle shadow-sm transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            aria-label={`${isOpen ? "Ocultar" : "Mostrar"} aclaraciones pendientes`}
          >
            <CircleHelp aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="font-medium text-ink">
              {pendingCount} aclaración{pendingCount === 1 ? "" : "es"} del
              dictado
            </span>
            <span className="hidden font-normal sm:inline">
              {isOpen ? "Cerrar" : "Revisar"}
            </span>
            {isOpen ? (
              <ChevronUp aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown aria-hidden className="h-3.5 w-3.5" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="absolute right-0 top-full mt-2 max-h-[min(60vh,32rem)] w-[calc(100vw-2rem)] max-w-md space-y-3 overflow-y-auto rounded-xl border border-hairline bg-surface p-3 shadow-xl">
            <div>
              <p className="text-sm font-medium text-ink">
                Aclaraciones del dictado
              </p>
              <p className="mt-1 text-xs text-subtle">
                Confirma lo que quiso decir la doctora. La selección se aprenderá
                para los próximos dictados de esta clínica.
              </p>
            </div>

            {batches.map((batch) => {
              const canResolve = batch.inconsistencies.every(
                (inconsistency) =>
                  inconsistency.candidates.length > 0 &&
                  Boolean(selections[inconsistency.id]),
              );
              return (
                <section
                  key={batch.dictationId}
                  className="space-y-3 rounded-lg border border-hairline bg-muted/30 p-3"
                  aria-label="Aclaraciones de un dictado"
                >
                  {batch.appliedLocally && (
                    <p className="rounded-md bg-brand/5 px-3 py-2 text-xs text-subtle">
                      La marca ya está aplicada. Solo falta guardar este aprendizaje.
                    </p>
                  )}
                  {batch.inconsistencies.map((inconsistency, index) => (
                    <div
                      key={inconsistency.id}
                      className={index > 0 ? "border-t border-hairline pt-3" : ""}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-xs font-medium text-ink">
                          {inconsistency.question}
                        </p>
                        <button
                          type="button"
                          className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                          aria-label="Descartar esta aclaración"
                          title="Descartar aclaración"
                          onClick={() =>
                            handleDismiss(batch.dictationId, inconsistency.id)
                          }
                        >
                          <X aria-hidden className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-subtle">
                        Se escuchó: “{inconsistency.sourceText}”
                      </p>

                      {inconsistency.candidates.length > 0 ? (
                        <RadioGroup
                          className="mt-3 gap-2"
                          value={selections[inconsistency.id]}
                          disabled={readOnly || batch.appliedLocally}
                          onValueChange={(candidateId) =>
                            setSelections((current) => ({
                              ...current,
                              [inconsistency.id]: candidateId,
                            }))
                          }
                        >
                          {inconsistency.candidates.map((candidate) => {
                            const optionId = `${inconsistency.id}-${candidate.id}`;
                            return (
                              <label
                                key={candidate.id}
                                htmlFor={optionId}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-hairline px-3 py-2 text-xs text-ink transition-colors hover:bg-hover has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5"
                              >
                                <RadioGroupItem id={optionId} value={candidate.id} />
                                <span>{candidate.label}</span>
                              </label>
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-subtle">
                          No se encontró una opción suficientemente segura. Vuelve a
                          dictar esta indicación con otras palabras.
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <OdontogramButton
                      size="sm"
                      variant="primary"
                      disabled={readOnly || !canResolve}
                      onClick={() => handleResolve(batch)}
                    >
                      {batch.appliedLocally
                        ? "Reintentar aprendizaje"
                        : "Confirmar y aplicar"}
                    </OdontogramButton>
                  </div>
                </section>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
