"use client";

import {
  createEmptySnapshot,
  type OdontogramAdapter,
  type OdontogramSnapshot,
} from "@/lib/odontogram/store";

const readStorage = (key: string): OdontogramSnapshot | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as OdontogramSnapshot;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, snapshot: OdontogramSnapshot) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(snapshot));
};

const removeStorage = (key: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

const buildKey = (namespace: string, patientId: string, clinicId?: string) =>
  `${namespace}:${clinicId ?? "default"}:${patientId}`;

export const createLocalStorageOdontogramAdapter = (
  options: string | { namespace?: string } = "odontogram",
): OdontogramAdapter => ({
  async load(patientId, clinicId) {
    const namespace =
      typeof options === "string" ? options : options.namespace ?? "odontogram";
    const key = buildKey(namespace, patientId, clinicId);
    return readStorage(key) ?? createEmptySnapshot({ patientId, clinicId });
  },
  async save(patientId, snapshot, clinicId) {
    const namespace =
      typeof options === "string" ? options : options.namespace ?? "odontogram";
    const key = buildKey(namespace, patientId, clinicId);
    writeStorage(key, snapshot);
  },
  async reset(patientId, clinicId) {
    const namespace =
      typeof options === "string" ? options : options.namespace ?? "odontogram";
    const key = buildKey(namespace, patientId, clinicId);
    removeStorage(key);
  },
});
