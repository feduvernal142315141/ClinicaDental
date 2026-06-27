"use client";

import { useState, useCallback, useEffect } from "react";

import { labelsService } from "@/lib/services/labels";
import type { Label, CreateLabelDto, UpdateLabelDto } from "@/lib/entity/label";
import { notify } from "@/lib/utils/notify";

// ── useLabels ────────────────────────────────────────────────────────────────

export function useLabels(includeArchived = false) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await labelsService.getLabels(includeArchived);
      setLabels(data);
    } catch {
      // error handled in service
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return { labels, loading, refetch: fetchLabels };
}

// ── useCreateLabel ────────────────────────────────────────────────────────────

export function useCreateLabel() {
  const [loading, setLoading] = useState(false);

  const createLabel = useCallback(
    async (data: CreateLabelDto): Promise<Label | null> => {
      setLoading(true);
      try {
        const label = await labelsService.createLabel(data);
        notify.success("Etiqueta creada");
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al crear etiqueta";
        notify.error(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createLabel, loading };
}

// ── useUpdateLabel ────────────────────────────────────────────────────────────

export function useUpdateLabel(id: string) {
  const [loading, setLoading] = useState(false);

  const updateLabel = useCallback(
    async (data: UpdateLabelDto): Promise<Label | null> => {
      setLoading(true);
      try {
        const label = await labelsService.updateLabel(id, data);
        notify.success("Etiqueta actualizada");
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al actualizar etiqueta";
        notify.error(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  return { updateLabel, loading };
}

// ── useArchiveLabel ───────────────────────────────────────────────────────────

export function useArchiveLabel(id: string) {
  const [loading, setLoading] = useState(false);

  const archiveLabel = useCallback(
    async (onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.archiveLabel(id);
        notify.success("Etiqueta archivada");
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al archivar etiqueta";
        notify.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  return { archiveLabel, loading };
}

// ── useAssignLabels ───────────────────────────────────────────────────────────

export function useAssignLabels(appointmentId: string) {
  const [loading, setLoading] = useState(false);

  const assignLabels = useCallback(
    async (labelIds: string[], onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.assignLabels(appointmentId, labelIds);
        notify.success("Etiquetas asignadas");
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al asignar etiquetas";
        notify.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [appointmentId],
  );

  return { assignLabels, loading };
}

// ── useRemoveLabel ────────────────────────────────────────────────────────────

export function useRemoveLabel(appointmentId: string) {
  const [loading, setLoading] = useState(false);

  const removeLabel = useCallback(
    async (labelId: string, onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.removeLabel(appointmentId, labelId);
        notify.success("Etiqueta removida");
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al remover etiqueta";
        notify.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [appointmentId],
  );

  return { removeLabel, loading };
}
