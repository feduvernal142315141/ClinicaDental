"use client";

import { useState, useCallback, useEffect } from "react";

import { labelsService } from "@/lib/services/labels";
import type { Label, CreateLabelDto, UpdateLabelDto } from "@/lib/entity/label";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";

// ── useLabels ────────────────────────────────────────────────────────────────

export function useLabels(includeArchived = false) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await labelsService.getLabels(includeArchived);
      setLabels(data);
    } catch (error) {
      notifyApiError("No se pudieron cargar las etiquetas", error);
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
        notify.success("Etiqueta creada", {
          description: "Ya está disponible para asignarla a tus citas.",
        });
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al crear etiqueta";
        notify.error(msg, {
          description: "No pudimos crear la etiqueta. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
        notify.success("Etiqueta actualizada", {
          description: "Los cambios se aplicaron en todas las citas que la usan.",
        });
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al actualizar etiqueta";
        notify.error(msg, {
          description: "No se guardaron los cambios de la etiqueta. Inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
        notify.success("Etiqueta archivada", {
          description: "Ya no aparecerá al asignar etiquetas; podrás restaurarla cuando lo necesites.",
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al archivar etiqueta";
        notify.error(msg, {
          description: "No pudimos archivar la etiqueta. Inténtalo de nuevo; si persiste, contacta a soporte.",
        });
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  return { archiveLabel, loading };
}

// ── useUnarchiveLabel ─────────────────────────────────────────────────────────

export function useUnarchiveLabel() {
  const [loading, setLoading] = useState(false);

  const unarchiveLabel = useCallback(
    async (id: string, name: string, onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.unarchiveLabel(id);
        notify.success("Etiqueta restaurada", {
          description: `"${name}" ya está disponible para asignarla a nuevas citas.`,
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al restaurar etiqueta";
        notify.error(msg, {
          description: "No pudimos restaurar la etiqueta. Inténtalo de nuevo; si persiste, contacta a soporte.",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { unarchiveLabel, loading };
}

// ── useArchiveLabelWithUndo ───────────────────────────────────────────────────
// Versión "fire-and-forget" con toast de Deshacer para el índice de etiquetas.
// Recibe refetch a nivel de hook para que el Deshacer siga funcionando aunque la
// tarjeta que disparó la acción ya no esté montada.

export function useArchiveLabelWithUndo(refetch: () => void) {
  const [loading, setLoading] = useState(false);

  const archiveWithUndo = useCallback(
    async (id: string, name: string): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.archiveLabel(id);
        refetch();
        notify.action(
          `"${name}" archivada`,
          {
            title: "Deshacer",
            onClick: async () => {
              try {
                await labelsService.unarchiveLabel(id);
                refetch();
                notify.success("Acción deshecha", {
                  description: `"${name}" vuelve a estar disponible para nuevas citas.`,
                });
              } catch {
                notify.error("No se pudo deshacer", {
                  description: `Puedes restaurar "${name}" desde el filtro de archivadas.`,
                });
              }
            },
          },
          {
            description:
              "Se ocultará para nuevas citas; las existentes conservan la etiqueta. Podrás restaurarla cuando quieras.",
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al archivar etiqueta";
        notify.error(msg, {
          description: "No pudimos archivar la etiqueta. Inténtalo de nuevo.",
        });
      } finally {
        setLoading(false);
      }
    },
    [refetch],
  );

  return { archiveWithUndo, loading };
}

// ── useAssignLabels ───────────────────────────────────────────────────────────

export function useAssignLabels(appointmentId: string) {
  const [loading, setLoading] = useState(false);

  const assignLabels = useCallback(
    async (labelIds: string[], onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.assignLabels(appointmentId, labelIds);
        notify.success("Etiquetas asignadas", {
          description: "Ya están visibles en la cita para identificarla más rápido.",
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al asignar etiquetas";
        notify.error(msg, {
          description: "No pudimos asignar las etiquetas a la cita. Inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
        notify.success("Etiqueta removida", {
          description: "Se quitó de la cita; puedes volver a asignarla cuando quieras.",
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al remover etiqueta";
        notify.error(msg, {
          description: "No pudimos quitar la etiqueta de la cita. Inténtalo de nuevo; si persiste, contacta a soporte.",
        });
      } finally {
        setLoading(false);
      }
    },
    [appointmentId],
  );

  return { removeLabel, loading };
}
