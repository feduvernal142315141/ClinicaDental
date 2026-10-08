"use client";

import { useState, useCallback, useEffect } from "react";

import { labelsService } from "@/lib/services/labels";
import type { Label, CreateLabelDto, UpdateLabelDto } from "@/lib/entity/label";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { useI18n } from "@/lib/contexts/i18n-context";

// ── useLabels ────────────────────────────────────────────────────────────────

export function useLabels(includeArchived = false) {
  const { t } = useI18n();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await labelsService.getLabels(includeArchived);
      setLabels(data);
    } catch (error) {
      notifyApiError(t("labels.notify.loadError"), error);
    } finally {
      setLoading(false);
    }
  }, [includeArchived, t]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return { labels, loading, refetch: fetchLabels };
}

// ── useCreateLabel ────────────────────────────────────────────────────────────

export function useCreateLabel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const createLabel = useCallback(
    async (data: CreateLabelDto): Promise<Label | null> => {
      setLoading(true);
      try {
        const label = await labelsService.createLabel(data);
        notify.success(t("labels.notify.createSuccess"), {
          description: t("labels.notify.createSuccessDescription"),
        });
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.createError");
        notify.error(msg, {
          description: t("labels.notify.createErrorDescription"),
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  return { createLabel, loading };
}

// ── useUpdateLabel ────────────────────────────────────────────────────────────

export function useUpdateLabel(id: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const updateLabel = useCallback(
    async (data: UpdateLabelDto): Promise<Label | null> => {
      setLoading(true);
      try {
        const label = await labelsService.updateLabel(id, data);
        notify.success(t("labels.notify.updateSuccess"), {
          description: t("labels.notify.updateSuccessDescription"),
        });
        return label;
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.updateError");
        notify.error(msg, {
          description: t("labels.notify.updateErrorDescription"),
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [id, t],
  );

  return { updateLabel, loading };
}

// ── useArchiveLabel ───────────────────────────────────────────────────────────

export function useArchiveLabel(id: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const archiveLabel = useCallback(
    async (onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.archiveLabel(id);
        notify.success(t("labels.notify.archiveSuccess"), {
          description: t("labels.notify.archiveSuccessDescription"),
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.archiveError");
        notify.error(msg, {
          description: t("labels.notify.archiveErrorDescription"),
        });
      } finally {
        setLoading(false);
      }
    },
    [id, t],
  );

  return { archiveLabel, loading };
}

// ── useUnarchiveLabel ─────────────────────────────────────────────────────────

export function useUnarchiveLabel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const unarchiveLabel = useCallback(
    async (id: string, name: string, onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.unarchiveLabel(id);
        notify.success(t("labels.notify.restoreSuccess"), {
          description: t("labels.notify.restoreSuccessDescription").replace(
            "{name}",
            name,
          ),
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.restoreError");
        notify.error(msg, {
          description: t("labels.notify.restoreErrorDescription"),
        });
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  return { unarchiveLabel, loading };
}

// ── useArchiveLabelWithUndo ───────────────────────────────────────────────────
// Versión "fire-and-forget" con toast de Deshacer para el índice de etiquetas.
// Recibe refetch a nivel de hook para que el Deshacer siga funcionando aunque la
// tarjeta que disparó la acción ya no esté montada.

export function useArchiveLabelWithUndo(refetch: () => void) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const archiveWithUndo = useCallback(
    async (id: string, name: string): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.archiveLabel(id);
        refetch();
        notify.action(
          t("labels.notify.archivedWithName").replace("{name}", name),
          {
            title: t("labels.actions.undo"),
            onClick: async () => {
              try {
                await labelsService.unarchiveLabel(id);
                refetch();
                notify.success(t("labels.notify.undoSuccess"), {
                  description: t("labels.notify.undoSuccessDescription").replace(
                    "{name}",
                    name,
                  ),
                });
              } catch {
                notify.error(t("labels.notify.undoError"), {
                  description: t("labels.notify.undoErrorDescription").replace(
                    "{name}",
                    name,
                  ),
                });
              }
            },
          },
          {
            description: t("labels.notify.archiveUndoDescription"),
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.archiveError");
        notify.error(msg, {
          description: t("labels.notify.archiveErrorShortDescription"),
        });
      } finally {
        setLoading(false);
      }
    },
    [refetch, t],
  );

  return { archiveWithUndo, loading };
}

// ── useAssignLabels ───────────────────────────────────────────────────────────

export function useAssignLabels(appointmentId: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const assignLabels = useCallback(
    async (labelIds: string[], onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.assignLabels(appointmentId, labelIds);
        notify.success(t("labels.notify.assignSuccess"), {
          description: t("labels.notify.assignSuccessDescription"),
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.assignError");
        notify.error(msg, {
          description: t("labels.notify.assignErrorDescription"),
        });
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, t],
  );

  return { assignLabels, loading };
}

// ── useRemoveLabel ────────────────────────────────────────────────────────────

export function useRemoveLabel(appointmentId: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const removeLabel = useCallback(
    async (labelId: string, onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await labelsService.removeLabel(appointmentId, labelId);
        notify.success(t("labels.notify.removeSuccess"), {
          description: t("labels.notify.removeSuccessDescription"),
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("labels.notify.removeError");
        notify.error(msg, {
          description: t("labels.notify.removeErrorDescription"),
        });
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, t],
  );

  return { removeLabel, loading };
}
