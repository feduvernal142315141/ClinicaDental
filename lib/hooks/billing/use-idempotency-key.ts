"use client";

import { useCallback, useRef } from "react";

/** Mensaje exacto del 409 del backend cuando la clave se reutiliza con otro pago. */
export const IDEMPOTENCY_KEY_REUSED_MESSAGE = "Esa Idempotency-Key ya se usó con otro pago.";

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Respaldo RFC 4122 v4 para navegadores sin randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Política de la `Idempotency-Key` de `POST /billing/payments`:
 * - una clave nueva cada vez que se ABRE el modal de pago;
 * - la misma clave en cualquier reintento de ese cobro (red caída, timeout…);
 * - una clave nueva si el backend responde 409 "ya se usó con otro pago"
 *   (cambió el monto o el paciente).
 */
export class IdempotencyKeyManager {
  private key: string;

  constructor(private readonly generate: () => string = generateIdempotencyKey) {
    this.key = generate();
  }

  current(): string {
    return this.key;
  }

  /** Al abrir el modal. */
  reset(): string {
    this.key = this.generate();
    return this.key;
  }

  /** Tras un error: solo cambia la clave si el backend dijo que ya se usó con otro pago. */
  handleError(error: unknown): string {
    const message = error instanceof Error ? error.message : "";
    if (message === IDEMPOTENCY_KEY_REUSED_MESSAGE) return this.reset();
    return this.key;
  }
}

export function useIdempotencyKey() {
  const manager = useRef<IdempotencyKeyManager | null>(null);
  if (!manager.current) manager.current = new IdempotencyKeyManager();

  const current = useCallback(() => manager.current!.current(), []);
  const reset = useCallback(() => manager.current!.reset(), []);
  const handleError = useCallback((error: unknown) => manager.current!.handleError(error), []);

  return { current, reset, handleError };
}
