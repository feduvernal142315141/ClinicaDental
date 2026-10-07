"use client";

import { LeadGate } from "@/components/features/leads/module/LeadGate";

/** Todas las rutas de Adquisición pasan por el interruptor del módulo y el permiso `leads`. */
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return <LeadGate>{children}</LeadGate>;
}
