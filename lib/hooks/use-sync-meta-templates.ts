"use client";

import { useRef, useState } from "react";
import { clinicTemplateService } from "@/lib/services/template/clinic-template.service";
import type { ClinicTemplate } from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";

export function useSyncMetaTemplates(onRefreshed: (templates: ClinicTemplate[]) => void) {
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
      notify.success("Sincronización completada", {
        description: `${result.imported} nuevas, ${result.updated} actualizadas`,
      });
    } catch (error) {
      notify.error(imported ? "Sincronizado; no se pudo refrescar la lista" : "No se pudo sincronizar", {
        description: imported ? "Recargá la lista para ver las plantillas importadas."
          : error instanceof Error ? error.message : "Intentá nuevamente.",
      });
    } finally {
      running.current = false;
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing };
}
