"use client";

/**
 * global-error.tsx — Error Boundary de último recurso (App Router).
 *
 * Se activa SOLO cuando el layout raíz (app/layout.tsx) lanza una excepción
 * de render. En ese caso, los providers (SileoToaster, ThemeProvider, etc.)
 * no están disponibles, por lo que se usa HTML y CSS inline mínimo.
 *
 * Ref: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalError] Error crítico de render:", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error — Clinic Flow 360</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,.08);
            padding: 2.5rem 2rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
          }
          .icon {
            width: 56px; height: 56px;
            background: #fef2f2;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 1.75rem;
          }
          h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: .5rem; }
          p  { font-size: .9rem; color: #475569; line-height: 1.6; margin-bottom: 1.5rem; }
          .digest { font-size: .75rem; color: #94a3b8; margin-bottom: 1.5rem; }
          .btn {
            display: inline-flex; align-items: center; gap: .5rem;
            background: #2563eb; color: #fff;
            border: none; border-radius: 8px;
            padding: .6rem 1.25rem; font-size: .875rem; font-weight: 500;
            cursor: pointer; transition: background .15s;
          }
          .btn:hover { background: #1d4ed8; }
          @media (prefers-color-scheme: dark) {
            body { background: #0f172a; color: #f1f5f9; }
            .card { background: #1e293b; box-shadow: 0 4px 24px rgba(0,0,0,.4); }
            .icon { background: #450a0a; }
            p { color: #94a3b8; }
          }
        `}</style>
      </head>
      <body>
        <div className="card" role="alert">
          <div className="icon" aria-hidden="true">⚠️</div>
          <h1>Error crítico</h1>
          <p>
            Ocurrió un error que impidió cargar la aplicación. Puedes
            reintentar; si el problema persiste, contacta a soporte.
          </p>
          {error.digest && (
            <p className="digest">
              Código de referencia: <code>{error.digest}</code>
            </p>
          )}
          <button className="btn" onClick={reset} type="button">
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
