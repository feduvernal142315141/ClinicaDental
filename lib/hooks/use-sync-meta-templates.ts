"use client";

import { useCallback, useRef, useState } from "react";
import { clinicTemplateService } from "@/lib/services/template/clinic-template.service";
import type {
  ClinicTemplate,
  MetaTemplateRepublishResult,
  TemplateDeleteResult,
} from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";
import { useI18n } from "@/lib/contexts/i18n-context";

/**
 * «Sincronizar con Meta»: trae al panel lo que hay en la cuenta de Meta y
 * actualiza estados. No sube nada.
 */
export function useSyncMetaTemplates(onRefreshed: (templates: ClinicTemplate[]) => void) {
  const { t } = useI18n();
  const [isSyncing, setIsSyncing] = useState(false);
  const running = useRef(false);

  const sync = async () => {
    if (running.current) return;
    running.current = true;
    setIsSyncing(true);
    let imported = false;
    try {
      const result = await clinicTemplateService.syncMetaTemplates();
      imported = true;
      const templates = await clinicTemplateService.getClinicTemplates();
      onRefreshed(templates);
      const summary = t("settings.notifications.sync.summary")
        .replace("{imported}", String(result.imported))
        .replace("{updated}", String(result.updated));
      const unavailable = result.unavailable ?? 0;
      if (unavailable > 0) {
        // No es un éxito a secas: hay plantillas que ya no se pueden enviar.
        notify.warning(t("settings.notifications.sync.doneWithUnavailable"), {
          description: `${summary}. ${t("settings.notifications.sync.unavailable").replace("{count}", String(unavailable))}`,
        });
      } else {
        notify.success(t("settings.notifications.sync.done"), { description: summary });
      }
    } catch (error) {
      notify.error(
        t(imported ? "settings.notifications.sync.refreshFailed" : "settings.notifications.sync.failed"),
        {
          description: imported
            ? t("settings.notifications.sync.refreshFailedDescription")
            : error instanceof Error
              ? error.message
              : t("settings.notifications.sync.retry"),
        },
      );
    } finally {
      running.current = false;
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing };
}

/**
 * «Republicar en la cuenta actual»: vuelve a crear en Meta las plantillas que la
 * clínica escribió en el panel. El resultado no es todo o nada, así que se
 * entrega entero (`result`) para que la pantalla lo detalle; aquí no hay toast
 * de éxito que lo resuma de más.
 */
export function useRepublishMetaTemplates(onRefreshed: (templates: ClinicTemplate[]) => void) {
  const { t } = useI18n();
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [result, setResult] = useState<MetaTemplateRepublishResult | null>(null);
  const running = useRef(false);

  const republish = async () => {
    if (running.current) return;
    running.current = true;
    setIsRepublishing(true);
    try {
      const outcome = await clinicTemplateService.republishMetaTemplates();
      setResult(outcome);
      try {
        onRefreshed(await clinicTemplateService.getClinicTemplates());
      } catch {
        notify.warning(t("settings.notifications.republish.refreshFailed"), {
          description: t("settings.notifications.sync.refreshFailedDescription"),
        });
      }
    } catch (error) {
      // Sin cuenta de WhatsApp o Meta inaccesible: no se creó nada.
      notify.error(t("settings.notifications.republish.failed"), {
        description: error instanceof Error ? error.message : t("settings.notifications.sync.retry"),
      });
    } finally {
      running.current = false;
      setIsRepublishing(false);
    }
  };

  const clearResult = useCallback(() => setResult(null), []);

  return { republish, isRepublishing, result, clearResult };
}

/**
 * Elimina una o varias plantillas. No es todo o nada —tampoco con una sola—, así
 * que lo eliminado se lee de `deletedIds`. Si todo salió, basta un aviso breve;
 * si algo quedó bloqueado o falló, se entrega `result` para que la pantalla diga
 * cuáles y qué hacer. Un 403 no añade toast: el interceptor ya muestra el aviso
 * global de permiso.
 *
 * @returns los ids eliminados de verdad (vacío si no salió ninguna).
 */
export function useDeleteMetaTemplates(onRefreshed: (templates: ClinicTemplate[]) => void) {
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<TemplateDeleteResult | null>(null);
  const running = useRef(false);

  const refresh = async () => {
    try {
      onRefreshed(await clinicTemplateService.getClinicTemplates());
    } catch {
      notify.warning(t("settings.notifications.delete.refreshFailed"), {
        description: t("settings.notifications.sync.refreshFailedDescription"),
      });
    }
  };

  const deleteTemplates = async (templateIds: string[]): Promise<string[]> => {
    const ids = Array.from(new Set(templateIds));
    if (ids.length === 0 || running.current) return [];
    running.current = true;
    setIsDeleting(true);
    try {
      const outcome =
        ids.length === 1
          ? await clinicTemplateService.deleteClinicTemplate(ids[0])
          : await clinicTemplateService.deleteClinicTemplates(ids);

      if (outcome.blocked.length > 0 || outcome.failed.length > 0) {
        setResult(outcome);
      } else if (outcome.deletedIds.length === ids.length) {
        notify.success(
          outcome.deletedIds.length === 1
            ? t("settings.notifications.delete.doneOne")
            : t("settings.notifications.delete.doneMany").replace("{count}", String(outcome.deletedIds.length)),
        );
      } else {
        // Menos de las pedidas y sin motivo: las demás ya no existían.
        notify.warning(
          t("settings.notifications.delete.donePartial")
            .replace("{deleted}", String(outcome.deletedIds.length))
            .replace("{requested}", String(ids.length)),
          { description: t("settings.notifications.delete.donePartialDescription") },
        );
      }
      await refresh();
      return outcome.deletedIds;
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 404) {
        notify.info(
          t(ids.length === 1 ? "settings.notifications.delete.missingOne" : "settings.notifications.delete.missingMany"),
          { description: t("settings.notifications.delete.missingDescription") },
        );
        await refresh();
      } else if (status !== 403) {
        // P. ej. no se pudo consultar Meta: no se eliminó nada.
        notify.error(t("settings.notifications.delete.failed"), {
          description: error instanceof Error ? error.message : t("settings.notifications.sync.retry"),
        });
      }
      return [];
    } finally {
      running.current = false;
      setIsDeleting(false);
    }
  };

  const clearResult = useCallback(() => setResult(null), []);

  return { deleteTemplates, isDeleting, result, clearResult };
}
