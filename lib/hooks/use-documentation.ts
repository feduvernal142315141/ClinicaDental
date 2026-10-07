"use client";
import { useCallback, useRef, useState } from "react";
import { documentationErrorMessage } from "@/lib/services/documentation/documentation-error";
import { notify } from "@/lib/utils/notify";
import { useI18n } from "@/lib/contexts/i18n-context";

/** One active operation per workspace; controlled validation errors explain how to recover. */
export function useDocumentationAction() {
  const { t } = useI18n();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (cause) {
      const message = documentationErrorMessage(cause, t);
      setError(message);
      notify.error(message);
    } finally { lock.current = false; setBusy(false); }
  }, [t]);
  return { busy, error, run };
}
