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
