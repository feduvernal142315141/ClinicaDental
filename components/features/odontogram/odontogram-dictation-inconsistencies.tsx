"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CircleHelp, RotateCcw, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { describeOdontogramDictationOperation } from "@/lib/odontogram/application/dictation";
import { cn } from "@/lib/odontogram/utils";
import type { OdontogramDictationOperationDescription } from "@/lib/odontogram/application/dictation";
import type {
  OdontogramDictationCandidate,
  OdontogramDictationInconsistency,
  ResolveOdontogramInconsistencyRequest,
} from "@/lib/entity/speech";

/**
 * Decisión del doctor sobre una aclaración: el id de la opción elegida, o
 * `null` cuando la descarta. Una clave ausente significa "todavía sin decidir",
 * y son esas las que mantienen el lote sin poder cerrarse.
 */
type InconsistencyDecision = string | null;

export interface OdontogramDictationInconsistencyBatch {
  dictationId: string;
  inconsistencies: OdontogramDictationInconsistency[];
  /**
   * El lote ya se decidió y se aplicó localmente; solo falta que el backend
   * guarde el aprendizaje. Conserva las decisiones exactas para que el
   * reintento mande el MISMO conjunto completo (el backend exige todas las
   * pendientes) y para no volver a aplicar el cambio clínico.
   */
  pendingLearning?: {
    resolutions: ResolveOdontogramInconsistencyRequest[];
    appliedOperations: number;
  };
}

/**
 * Lo que ESA opción escribiría de verdad en el odontograma.
 *
 * `candidate.label` lo redacta el modelo y el backend NO lo contrasta con la
 * operación: solo comprueba que no esté vacío y que mida menos de 200
 * caracteres. Elegir por ese rótulo es firmar un cambio en una historia clínica
 * sin haberlo leído, así que el rótulo se queda como titular y debajo va la
 * descripción que produce el propio módulo del odontograma
 * (`describeOdontogramDictationOperation`, pura y sin store), con caras,
 * detalle clínico y si borra algo.
 */
function describeCandidate(
  candidate: OdontogramDictationCandidate,
  fallbackToothNumber: number | undefined,
): OdontogramDictationOperationDescription[] {
  const toothNumber = candidate.toothChange?.toothNumber ?? fallbackToothNumber;
  if (toothNumber === undefined) return [];

  const operations = candidate.toothChange?.operations?.length
    ? candidate.toothChange.operations
    : candidate.operation
      ? [candidate.operation]
      : [];

  return operations.map((operation) =>
    describeOdontogramDictationOperation(toothNumber, operation),
  );
}

/** Detalle clínico de una opción, en el mismo vocabulario que la previsualización. */
function CandidateOperations({
  descriptions,
}: {
  descriptions: OdontogramDictationOperationDescription[];
}) {
  if (descriptions.length === 0) {
    return (
      <p className="text-[11px] text-amber-800 dark:text-amber-200">
        Esta opción no trae el cambio concreto que aplicaría. Descártala y
        vuelve a dictar la indicación con otras palabras.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {descriptions.map((description, index) => {
        // El primer detalle repite el titular en los hallazgos de superficie
        // ("Caries" + "Caries en O"): se omite el chip redundante, no el dato.
        const chips = description.details.filter(
          (detail) => !description.summary.startsWith(detail),
        );
        return (
          <li key={`${description.sequence}-${index}`} className="space-y-1">
            <p
              className={cn(
                "text-[11px] font-medium",
                description.destructive
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-ink",
              )}
            >
              {description.toothLabel} · {description.summary}
            </p>
            {(description.destructive || chips.length > 0) && (
              <div className="flex flex-wrap items-center gap-1">
                {description.destructive && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                    {description.actionLabel}
                  </span>
                )}
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-subtle"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface OdontogramDictationInconsistenciesProps {
  batches: OdontogramDictationInconsistencyBatch[];
  readOnly: boolean;
  onResolve: (
    batch: OdontogramDictationInconsistencyBatch,
    resolutions: ResolveOdontogramInconsistencyRequest[],
  ) => void;
}

export function OdontogramDictationInconsistencies({
  batches,
  readOnly,
  onResolve,
}: OdontogramDictationInconsistenciesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, InconsistencyDecision>
  >({});

  const pendingCount = useMemo(
    () =>
      batches.reduce(
        (total, batch) => total + batch.inconsistencies.length,
        0,
      ),
    [batches],
  );

  if (pendingCount === 0) return null;

  /**
   * Decisiones vigentes del lote. En reintento mandan las ya enviadas: el
   * backend necesita recibir exactamente el mismo conjunto completo.
   */
  const decisionsOf = (
    batch: OdontogramDictationInconsistencyBatch,
  ): Map<string, InconsistencyDecision> =>
    batch.pendingLearning
      ? new Map(
          batch.pendingLearning.resolutions.map((resolution) => [
            resolution.inconsistencyId,
            resolution.candidateId,
          ]),
        )
      : new Map(
          batch.inconsistencies
            .filter((inconsistency) => inconsistency.id in decisions)
            .map((inconsistency) => [
              inconsistency.id,
              decisions[inconsistency.id],
            ]),
        );

  const decide = (inconsistencyId: string, decision: InconsistencyDecision) => {
    setDecisions((current) => ({ ...current, [inconsistencyId]: decision }));
  };

  const undecide = (inconsistencyId: string) => {
    setDecisions((current) => {
      const next = { ...current };
      delete next[inconsistencyId];
      return next;
    });
  };

  const handleResolve = (batch: OdontogramDictationInconsistencyBatch) => {
    const batchDecisions = decisionsOf(batch);
    const resolutions = batch.inconsistencies.map((inconsistency) => ({
      inconsistencyId: inconsistency.id,
      candidateId: batchDecisions.get(inconsistency.id) ?? null,
    }));

    onResolve(batch, resolutions);
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
                Confirma lo que quiso decir la doctora leyendo el cambio real de
                cada opción: el rótulo lo redacta la IA, el detalle de debajo es
                lo que se escribiría. La selección se aprenderá para los
                próximos dictados de esta clínica. Lo que descartes se cierra
                sin aprenderse.
              </p>
            </div>

            {batches.map((batch) => {
              const retrying = batch.pendingLearning;
              const batchDecisions = decisionsOf(batch);
              // Cada aclaración pendiente tiene que estar decidida —elegida o
              // descartada— porque el backend exige el lote completo. Una sin
              // candidatos solo se puede descartar, y ya no bloquea al resto.
              const canResolve = batch.inconsistencies.every((inconsistency) =>
                batchDecisions.has(inconsistency.id),
              );
              const locked = readOnly || !!retrying;
              return (
                <section
                  key={batch.dictationId}
                  className="space-y-3 rounded-lg border border-hairline bg-muted/30 p-3"
                  aria-label="Aclaraciones de un dictado"
                >
                  {retrying && (
                    <p className="rounded-md bg-brand/5 px-3 py-2 text-xs text-subtle">
                      {retrying.appliedOperations > 0
                        ? "La marca ya está aplicada. Solo falta guardar este aprendizaje."
                        : "Las aclaraciones ya se decidieron. Solo falta guardar esa decisión."}
                    </p>
                  )}
                  {batch.inconsistencies.map((inconsistency, index) => {
                    const decision = batchDecisions.get(inconsistency.id);
                    const isDismissed =
                      batchDecisions.has(inconsistency.id) && decision === null;
                    return (
                      <div
                        key={inconsistency.id}
                        className={index > 0 ? "border-t border-hairline pt-3" : ""}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`min-w-0 text-xs font-medium ${
                              isDismissed
                                ? "text-subtle line-through"
                                : "text-ink"
                            }`}
                          >
                            {inconsistency.question}
                          </p>
                          {!isDismissed && (
                            <button
                              type="button"
                              className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40"
                              aria-label="Descartar esta aclaración"
                              title="Descartar aclaración"
                              disabled={locked}
                              onClick={() => decide(inconsistency.id, null)}
                            >
                              <X aria-hidden className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-subtle">
                          Se escuchó: “{inconsistency.sourceText}”
                        </p>

                        {isDismissed ? (
                          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-subtle">
                            <span>
                              Descartada — no se aprenderá de esta aclaración.
                            </span>
                            {!locked && (
                              <button
                                type="button"
                                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 font-medium text-brand transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                                onClick={() => undecide(inconsistency.id)}
                              >
                                <RotateCcw aria-hidden className="h-3 w-3" />
                                Recuperar
                              </button>
                            )}
                          </div>
                        ) : inconsistency.candidates.length > 0 ? (
                          <RadioGroup
                            className="mt-3 gap-2"
                            value={decision ?? undefined}
                            disabled={locked}
                            onValueChange={(candidateId) =>
                              decide(inconsistency.id, candidateId)
                            }
                          >
                            {inconsistency.candidates.map((candidate) => {
                              const optionId = `${inconsistency.id}-${candidate.id}`;
                              const detailId = `${optionId}-detail`;
                              const descriptions = describeCandidate(
                                candidate,
                                inconsistency.toothNumber,
                              );
                              return (
                                <div
                                  key={candidate.id}
                                  className="overflow-hidden rounded-md border border-hairline transition-colors has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5"
                                >
                                  <label
                                    htmlFor={optionId}
                                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-ink transition-colors hover:bg-hover"
                                  >
                                    <RadioGroupItem
                                      id={optionId}
                                      value={candidate.id}
                                      aria-describedby={detailId}
                                    />
                                    <span>{candidate.label}</span>
                                  </label>
                                  {/* El rótulo de arriba lo escribe la IA y nadie
                                      lo valida: esto es lo que se escribiría. */}
                                  <div
                                    id={detailId}
                                    className="space-y-1.5 border-t border-hairline bg-surface/60 px-3 py-2"
                                  >
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                                      Se escribiría en el odontograma
                                    </p>
                                    <CandidateOperations
                                      descriptions={descriptions}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        ) : (
                          <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-subtle">
                            No se encontró una opción suficientemente segura.
                            Descártala y vuelve a dictar esta indicación con
                            otras palabras.
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end">
                    <OdontogramButton
                      size="sm"
                      variant="primary"
                      disabled={readOnly || !canResolve}
                      onClick={() => handleResolve(batch)}
                    >
                      {retrying ? "Reintentar aprendizaje" : "Confirmar y aplicar"}
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
