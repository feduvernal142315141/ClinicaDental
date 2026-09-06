"use client";

import { useEffect, useState } from "react";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";

const blobCache = new Map<string, { url: string; refCount: number }>();

export function getCachedBlobUrl(patientId: string, attachmentId: string): string | null {
  const key = `${patientId}:${attachmentId}`;
  return blobCache.get(key)?.url ?? null;
}

export async function fetchAttachmentBlobUrl(
  patientId: string,
  attachmentId: string,
): Promise<string> {
  const key = `${patientId}:${attachmentId}`;
  const existing = blobCache.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing.url;
  }

  const blob = await patientAttachmentsService.downloadAttachment(patientId, attachmentId);
  const url = URL.createObjectURL(blob);
  blobCache.set(key, { url, refCount: 1 });
  return url;
}

export function releaseAttachmentBlobUrl(patientId: string, attachmentId: string): void {
  const key = `${patientId}:${attachmentId}`;
  const entry = blobCache.get(key);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    URL.revokeObjectURL(entry.url);
    blobCache.delete(key);
  }
}

export function useAttachmentBlob(
  patientId: string,
  attachmentId: string,
  enabled = true,
) {
  const [blobUrl, setBlobUrl] = useState<string | null>(() =>
    getCachedBlobUrl(patientId, attachmentId),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !patientId || !attachmentId) return;

    const cached = getCachedBlobUrl(patientId, attachmentId);
    if (cached) {
      setBlobUrl(cached);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchAttachmentBlobUrl(patientId, attachmentId)
      .then((url) => {
        if (isMounted) {
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error al cargar archivo",
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, attachmentId, enabled]);

  return { blobUrl, loading, error };
}
