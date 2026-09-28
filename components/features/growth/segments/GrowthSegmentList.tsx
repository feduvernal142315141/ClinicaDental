"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui";
import { Plus, Filter, Pencil, Trash2, Users } from "lucide-react";
import { useGrowthSegments, useSegmentEvaluation } from "@/lib/hooks/growth";
import {
  SEGMENT_FIELD_OPTIONS,
  SEGMENT_OPERATOR_LABELS,
} from "@/lib/entity/growth/segments";
import { parseFilterDefinition } from "@/lib/entity/growth";
import type { SegmentCondition, SegmentConditionOperator } from "@/lib/entity/growth";

function formatCondition(c: SegmentCondition): string {
  const fieldMeta = SEGMENT_FIELD_OPTIONS.find((f) => f.value === c.field);
  const fieldLabel = fieldMeta?.label ?? c.field;
  const opLabel = SEGMENT_OPERATOR_LABELS[c.operator as SegmentConditionOperator] ?? c.operator;

  if (c.operator === "IS_NULL" || c.operator === "IS_NOT_NULL") {
    return `${fieldLabel} ${opLabel}`;
  }
  const displayValue = Array.isArray(c.value) ? c.value.join(", ") : String(c.value);
  return `${fieldLabel} ${opLabel} ${displayValue}`;
}


export function GrowthSegmentList() {
  const router = useRouter();
  const { segments, loading, error, remove } = useGrowthSegments();
  const { evaluation, evaluating, evaluate } = useSegmentEvaluation();
  const [evaluatedSegmentId, setEvaluatedSegmentId] = useState<string | null>(null);

  const handleEvaluate = useCallback(
    async (id: string) => {
      setEvaluatedSegmentId(id);
      await evaluate(id);
    },
    [evaluate],
  );

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/growth/segments/${id}`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title="Segmentos"
        description="Define audiencias para tus campañas"
        action={
          <Button onClick={() => router.push("/growth/segments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo segmento
          </Button>
        }
      />

      {error && segments.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron actualizar los segmentos.</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message="Cargando segmentos..." />
        </div>
      )}

      {!loading && segments.length === 0 && (
        <EmptyState
          icon={Filter}
          title="Sin segmentos"
          description="Crea tu primer segmento para definir audiencias de tus campañas."
          variant="card"
          action={
            <Button onClick={() => router.push("/growth/segments/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo segmento
            </Button>
          }
        />
      )}

      {!loading && segments.length > 0 && (
        <div className="space-y-3">
          {segments.map((segment) => {
            const conditions = parseFilterDefinition(segment.filterDefinition).conditions;
            return (
              <div
                key={segment.id}
                className="rounded-xl border border-hairline bg-surface p-4 cursor-pointer hover:border-foreground/15 transition-colors"
                onClick={() => handleRowClick(segment.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-medium text-ink">{segment.name}</h3>
                    {segment.description && (
                      <p className="text-sm text-subtle">{segment.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {conditions.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-hover px-2 py-0.5 text-xs text-subtle ring-1 ring-hairline"
                        >
                          {formatCondition(c)}
                        </span>
                      ))}
                      {conditions.length > 1 && (
                        <span className="text-xs text-subtle font-medium px-1">
                          (AND)
                        </span>
                      )}
                    </div>
                    {segment.cachedCount != null && (
                      <p className="text-xs text-subtle mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        ~{segment.cachedCount.toLocaleString("es")} pacientes
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEvaluate(segment.id)}
                      disabled={evaluating}
                      title="Calcular audiencia"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        router.push(`/growth/segments/${segment.id}`)
                      }
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Eliminar">
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar este segmento?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará permanentemente &ldquo;{segment.name}
                            &rdquo;. Las campañas que lo usen perderán la
                            referencia.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove(segment.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {evaluatedSegmentId === segment.id && evaluation && (
                  <p className="text-sm text-ink mt-2 font-medium">
                    {evaluation.count.toLocaleString("es")} pacientes
                    cumplen este segmento
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
