"use client";

import { useState, useEffect, useCallback } from "react";

import { clinicalHistoryService } from "@/lib/services/clinical-history";
import { notify } from "@/lib/utils/notify";

export function useClinicalNotes(patientId: string, initialNotes?: string) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ at: string; by: string } | null>(null);

  // Sync when initialNotes changes (snapshot load)
  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  const save = useCallback(
    async (html?: string) => {
      const content = html ?? notes;
      setSaving(true);
      try {
        const result = await clinicalHistoryService.saveClinicalNotes(patientId, content);
        setLastSaved({ at: result.updatedAt, by: result.updatedBy });
        notify.success("Notas guardadas");
      } catch {
        notify.error("No se pudieron guardar las notas");
      } finally {
        setSaving(false);
      }
    },
    [patientId, notes],
  );

  return { notes, setNotes, saving, lastSaved, save };
}
