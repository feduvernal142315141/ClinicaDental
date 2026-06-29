"use client";

/**
 * Error Boundary — área autenticada (App Router).
 *
 * Se activa cuando un componente de render dentro de (authenticated)
 * lanza una excepción no capturada. DISTINTO de los errores de red,
 * que los maneja el interceptor de Axios.
 *
 * El layout raíz (y por tanto SileoToaster, providers, etc.) sigue activo.
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

interface AuthenticatedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthenticatedError({
  error,
  reset,
}: AuthenticatedErrorProps) {
  useEffect(() => {
    // Solo para logs/telemetría — nunca mostrar al usuario.
    console.error("[AuthenticatedError] Error de render:", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      {/* Icono */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden />
      </div>

      {/* Titulo y descripción */}
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">
          Algo salió mal
        </h1>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado al mostrar esta sección. Puedes reintentar
          o volver al inicio; si el problema persiste, contacta a soporte.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            Código de referencia: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Home className="h-4 w-4" aria-hidden />
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
