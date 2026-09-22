"use client";

import { useEffect, useState } from "react";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";

interface CacheEntry {
  promise: Promise<string>;
  url: string | null;
  refCount: number;
}

const cache = new Map<string, CacheEntry>();

const keyOf = (patientId: string, attachmentId: string) => `${patientId}:${attachmentId}`;

function acquire(patientId: string, attachmentId: string): Promise<string> {
  const key = keyOf(patientId, attachmentId);
  const existing = cache.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing.promise;
  }

  const entry: CacheEntry = { url: null, refCount: 1, promise: Promise.resolve("") };
  entry.promise = patientAttachmentsService
    .downloadAttachment(patientId, attachmentId)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      entry.url = url;
      if (entry.refCount <= 0) {
        URL.revokeObjectURL(url);
        cache.delete(key);
      }
      return url;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, entry);
  return entry.promise;
}

function release(patientId: string, attachmentId: string): void {
  const key = keyOf(patientId, attachmentId);
  const entry = cache.get(key);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  if (entry.url) {
    URL.revokeObjectURL(entry.url);
    cache.delete(key);
  }
}

export function useAttachmentBlob(
  patientId: string,
  attachmentId: string,
  enabled = true,
) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !patientId || !attachmentId) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    const pending = acquire(patientId, attachmentId);
    pending
      .then((url) => {
        if (!alive) return;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setBlobUrl(null);
        setError(err instanceof Error ? err.message : "No se pudo cargar el archivo");
        setLoading(false);
      });

    return () => {
      alive = false;
      pending.then(
        () => release(patientId, attachmentId),
        () => undefined,
      );
    };
  }, [patientId, attachmentId, enabled]);

  return { blobUrl, loading, error };
}
