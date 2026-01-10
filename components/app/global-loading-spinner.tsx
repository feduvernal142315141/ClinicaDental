"use client";

/**
 * LOADING SPINNER GLOBAL
 *
 * Muestra un spinner global cuando hay peticiones HTTP activas.
 * Se actualiza automáticamente usando el InterceptorContext.
 */

import { useGlobalLoading } from "@/lib/contexts/interceptor-context";
import { Loader2 } from "lucide-react";

export function GlobalLoadingSpinner() {
  const { isLoading, activeRequests } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Cargando...
        </p>
        {activeRequests > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeRequests} peticiones activas
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * VERSIÓN MINIMALISTA (Solo barra superior)
 */
export function GlobalLoadingBar() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      <div className="h-full w-full animate-pulse" />
    </div>
  );
}

/**
 * VERSIÓN CON CONTADOR EN ESQUINA
 */
export function GlobalLoadingBadge() {
  const { isLoading, activeRequests } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow-lg">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">
        {activeRequests} {activeRequests === 1 ? "petición" : "peticiones"}
      </span>
    </div>
  );
}
