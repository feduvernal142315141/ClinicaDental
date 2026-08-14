"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { isPublicRoute } from "@/lib/constants/routes.constants";
import { useAuth } from "@/lib/contexts/auth-context";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { FeedbackModal } from "./FeedbackModal";

/**
 * Botón flotante (FAB) para reportar feedback.
 * Visible en todas las páginas autenticadas, esquina inferior derecha.
 *
 * **Este botón es el DUEÑO de la esquina inferior derecha.** Está en todas las
 * pantallas autenticadas, así que cualquier control flotante de una vista
 * concreta tiene que apartarse de su hueco (48px + 24px de margen):
 * - un FAB propio de la página se apila ENCIMA (`bottom-24`), no a su lado;
 * - una barra dentro de un lienzo se corre a la izquierda (`right-20`).
 * Ya pasó dos veces: la barra de zoom del odontograma quedaba tapada y el
 * filtro móvil de la agenda se superponía exactamente encima.
 */
export function FeedbackFAB() {
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  // No mostrar en rutas públicas ni sin sesión
  if (pathname === "/" || isPublicRoute(pathname) || !user) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Reportar feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>

      <FeedbackModal open={open} onClose={handleClose} />
    </>
  );
}
