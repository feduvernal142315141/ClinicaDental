"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Proveedor de React Query de la app.
 *
 * Valores por defecto conservadores: un reintento y sin refetch en cada foco salvo que la
 * consulta lo pida (capabilities sí lo pide, ver `useClinicCapabilities`).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Un reintento solo para fallos de red o del servidor: un 4xx no cambia al repetirlo.
            retry: (failureCount, error) => {
              const status = (error as { status?: number } | null)?.status;
              if (status !== undefined && status >= 400 && status < 500) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
