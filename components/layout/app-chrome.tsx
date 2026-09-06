"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/constants/routes.constants";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Rutas que se pintan a sangre: sin `AppHeader` y sin el padding del `<main>`,
 * para que la ficha ocupe el ancho completo del área de contenido.
 *
 * Deliberadamente ESTRICTA. `/patients`, `/patients/new` y
 * `/patients/{id}/edit` conservan el chrome normal, así que no vale un
 * `startsWith("/patients")`: el patrón exige exactamente un segmento después de
 * `/patients` y excluye `new` por nombre.
 */
const BLEED_ROUTE = /^\/patients\/(?!new$)[^/]+$/;

function isBleedRoute(pathname: string): boolean {
  return BLEED_ROUTE.test(pathname);
}

/**
 * Único punto de decisión del chrome de la app. Rutas públicas (login,
 * recuperar contraseña, OTP) y la raíz se renderizan sin shell; el resto va
 * dentro del `AppShell`, en su variante normal o a sangre.
 *
 * La variante se pasa por PROP en vez de resolverse con un tercer early-return
 * para que `AppShell` no se remonte al entrar y salir de la ficha: su colapso
 * de sidebar es `useState` local y se reiniciaría en cada navegación.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (pathname === "/" || isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return <AppShell bleed={isBleedRoute(pathname)}>{children}</AppShell>;
}
