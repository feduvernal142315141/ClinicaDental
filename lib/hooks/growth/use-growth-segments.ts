"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useQuery } from "@tanstack/react-query";
import type {
  PatientSegment,
  PatientSegmentListResponse,
  SegmentAudience,
  SegmentEvaluationResult,
} from "@/lib/entity/growth";
import {
  buildSegmentConditions,
  parseFilterDefinition,
  segmentAudience,
  serializeFilterDefinition,
} from "@/lib/entity/growth";
import { useLeadModule } from "@/lib/hooks/leads";
import { growthErrorMessage, isGrowthApiError } from "@/lib/services/growth/growth-errors";
import { notifyGrowthError } from "./growth-notify";
import {
  getPatientSegments,
  getPatientSegmentById,
  createPatientSegment,
  updatePatientSegment,
  deletePatientSegment,
  evaluatePatientSegment,
  getSegmentFields,
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
        notifyGrowthError(err, "Error al eliminar el segmento");
      }
    },
    [fetchData],
  );

  return { segments, loading, error, refresh: fetchData, remove };
}

// ── Field catalog ───────────────────────────────────────────────────────────

/** Fields a segment of that audience can filter by (`GET /patient-segments/fields`). */
export function useSegmentFieldCatalog(audience: SegmentAudience, enabled = true) {
  return useQuery({
    queryKey: ["growth", "segment-fields", audience] as const,
    queryFn: async () => (await getSegmentFields(audience)).fields ?? [],
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });
}

// ── Form hook ───────────────────────────────────────────────────────────────

interface UseGrowthSegmentFormParams {
  segmentId?: string;
  basePath?: string;
}

const EMPTY_CONDITION = { field: "", operator: "", value: "" };

export function useGrowthSegmentForm({
  segmentId,
  basePath = "/growth/segments",
}: UseGrowthSegmentFormParams) {
  const router = useRouter();
  const isEdit = !!segmentId;
  const { enabled: leadModuleEnabled } = useLeadModule();
  /** Backend error that belongs next to the conditions (field of another audience, bad filter). */
  const [conditionsError, setConditionsError] = useState<string | null>(null);

  const form = useForm<GrowthSegmentFormValues>({
    resolver: zodResolver(growthSegmentFormSchema),
    mode: "onBlur",
    defaultValues: {
      audience: "PATIENT",
      name: "",
      description: "",
      conditions: [EMPTY_CONDITION],
    },
  });

  const { reset, setValue, setError, watch } = form;
  const audience = watch("audience");
  const catalog = useSegmentFieldCatalog(audience);

  useEffect(() => {
    if (!isEdit || !segmentId) return;

    getPatientSegmentById(segmentId)
      .then((segment) => {
        const parsed = parseFilterDefinition(segment.filterDefinition);
        reset({
          audience: segmentAudience(segment.audience),
          name: segment.name,
          description: segment.description ?? "",
          conditions: parsed.conditions.length > 0
            ? parsed.conditions
            : [EMPTY_CONDITION],
        });
      })
      .catch((err) => {
        notifyGrowthError(err, "No se pudo cargar el segmento");
      });
  }, [isEdit, segmentId, reset]);

  // The module was turned off with the form open: the prospects audience is no longer offered.
  useEffect(() => {
    if (isEdit || leadModuleEnabled || audience !== "LEAD") return;
    setValue("audience", "PATIENT");
    setValue("conditions", [EMPTY_CONDITION]);
  }, [isEdit, leadModuleEnabled, audience, setValue]);

  /** Only on creation: each audience has its own fields, so the conditions start over. */
  const changeAudience = useCallback(
    (next: SegmentAudience) => {
      if (isEdit || next === audience) return;
      setValue("audience", next);
      setValue("conditions", [EMPTY_CONDITION]);
      form.clearErrors("conditions");
      setConditionsError(null);
    },
    [isEdit, audience, setValue, form],
  );

  const handleSubmit = useCallback(
    async (values: GrowthSegmentFormValues) => {
      setConditionsError(null);
      if (!catalog.data) {
        notify.error("Todavía no se cargan los campos del segmento. Inténtalo de nuevo.");
        return;
      }

      const built = buildSegmentConditions(values.conditions, catalog.data);
      if (built.errors.length > 0) {
        built.errors.forEach(({ index, error }) =>
          setError(`conditions.${index}.${error.target}`, { type: "validate", message: error.message }),
        );
        return;
      }

      const filterDefinition = serializeFilterDefinition({
        logic: "AND",
        conditions: built.conditions,
      });

      try {
        if (isEdit && segmentId) {
          // The audience is immutable: it is not sent on update.
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
            audience: values.audience,
          });
          notify.success("Segmento creado");
        }
        router.push(basePath);
        router.refresh();
      } catch (err: unknown) {
        // A rejected filter (400) is about the conditions: say it there, not only in a toast.
        if (isGrowthApiError(err) && err.status === 400) {
          setConditionsError(err.message);
        }
        notifyGrowthError(err, "Error al guardar el segmento");
      }
    },
    [isEdit, segmentId, router, basePath, catalog.data, setError],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    form,
    isEdit,
    audience,
    /** The prospects audience exists only with LEAD_CRM, and only when creating. */
    canChooseAudience: !isEdit && leadModuleEnabled,
    changeAudience,
    fields: catalog.data,
    fieldsLoading: catalog.isPending,
    fieldsError: catalog.isError ? growthErrorMessage(catalog.error, "Error al cargar los campos del segmento") : null,
    conditionsError,
    handleSubmit,
    handleCancel,
  };
}

// ── Evaluate hook ───────────────────────────────────────────────────────────

interface UseSegmentEvaluationResult {
  evaluation: SegmentEvaluationResult | null;
  evaluating: boolean;
  evaluate: (id: string) => Promise<void>;
  /** Forget the last result (the selected segment changed). */
  reset: () => void;
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
      setEvaluation(null);
      notifyGrowthError(err, "Error al evaluar el segmento");
    } finally {
      setEvaluating(false);
    }
  }, []);

  const resetEvaluation = useCallback(() => setEvaluation(null), []);

  return { evaluation, evaluating, evaluate, reset: resetEvaluation };
}
