"use client";

import { useState, useEffect, useCallback } from "react";
import { App } from "antd";
import { clinicalHistoryService } from "@/lib/services/clinical-history";

export function useClinicalNotes(patientId: string, initialNotes?: string) {
  const { message } = App.useApp();
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
        message.success("Notas guardadas");
      } catch {
        message.error("No se pudieron guardar las notas");
      } finally {
        setSaving(false);
      }
    },
    [patientId, notes, message],
  );

  return { notes, setNotes, saving, lastSaved, save };
}
