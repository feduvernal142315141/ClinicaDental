"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  PatientSegment,
  PatientSegmentListResponse,
  SegmentEvaluationResult,
} from "@/lib/entity/growth";
import { parseFilterDefinition, serializeFilterDefinition } from "@/lib/entity/growth";
import {
  getPatientSegments,
  getPatientSegmentById,
  createPatientSegment,
  updatePatientSegment,
  deletePatientSegment,
  evaluatePatientSegment,
} from "@/lib/services/growth/growth-segments.service";
import {
  growthSegmentFormSchema,
  type GrowthSegmentFormValues,
} from "./growth-segment-form.schema";
import { notify } from "@/lib/utils/notify";

// ── List hook ───────────────────────────────────────────────────────────────

interface UseGrowthSegmentsResult {
  segments: PatientSegment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  remove: (id: string) => Promise<void>;
}

export function useGrowthSegments(): UseGrowthSegmentsResult {
  const [segments, setSegments] = useState<PatientSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPatientSegments();
      setSegments(
        (result as PatientSegmentListResponse).entities ??
          (Array.isArray(result) ? result : []),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar segmentos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deletePatientSegment(id);
        notify.success("Segmento eliminado");
        fetchData();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error ? err.message : "Error al eliminar el segmento",
        );
      }
    },
    [fetchData],
  );

  return { segments, loading, error, refresh: fetchData, remove };
}

// ── Form hook ───────────────────────────────────────────────────────────────

interface UseGrowthSegmentFormParams {
  segmentId?: string;
  basePath?: string;
}

export function useGrowthSegmentForm({
  segmentId,
  basePath = "/growth/segments",
}: UseGrowthSegmentFormParams) {
  const router = useRouter();
  const isEdit = !!segmentId;

  const form = useForm<GrowthSegmentFormValues>({
    resolver: zodResolver(growthSegmentFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      conditions: [{ field: "", operator: "", value: "" }],
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!isEdit || !segmentId) return;

    getPatientSegmentById(segmentId)
      .then((segment) => {
        const parsed = parseFilterDefinition(segment.filterDefinition);
        reset({
          name: segment.name,
          description: segment.description ?? "",
          conditions: parsed.conditions.length > 0
            ? parsed.conditions
            : [{ field: "", operator: "", value: "" }],
        });
      })
      .catch((err) => {
        notify.error(err?.message || "No se pudo cargar el segmento");
      });
  }, [isEdit, segmentId, reset]);

  const handleSubmit = useCallback(
    async (values: GrowthSegmentFormValues) => {
      const filterDefinition = serializeFilterDefinition({
        logic: "AND",
        conditions: values.conditions,
      });

      try {
        if (isEdit && segmentId) {
          await updatePatientSegment(segmentId, {
            name: values.name,
            description: values.description,
            filterDefinition,
          });
          notify.success("Segmento actualizado");
        } else {
          await createPatientSegment({
            name: values.name,
            description: values.description,
            filterDefinition,
          });
          notify.success("Segmento creado");
        }
        router.push(basePath);
        router.refresh();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error ? err.message : "Error al guardar el segmento",
        );
      }
    },
    [isEdit, segmentId, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return { form, isEdit, handleSubmit, handleCancel };
}

// ── Evaluate hook ───────────────────────────────────────────────────────────

interface UseSegmentEvaluationResult {
  evaluation: SegmentEvaluationResult | null;
  evaluating: boolean;
  evaluate: (id: string) => Promise<void>;
}

export function useSegmentEvaluation(): UseSegmentEvaluationResult {
  const [evaluation, setEvaluation] =
    useState<SegmentEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const evaluate = useCallback(async (id: string) => {
    setEvaluating(true);
    try {
      const result = await evaluatePatientSegment(id);
      setEvaluation(result);
    } catch (err: unknown) {
      notify.error(
        err instanceof Error ? err.message : "Error al evaluar el segmento",
      );
    } finally {
      setEvaluating(false);
    }
  }, []);

  return { evaluation, evaluating, evaluate };
}
