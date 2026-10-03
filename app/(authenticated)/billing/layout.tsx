"use client";

import { FinanceGate } from "@/components/features/billing/module/FinanceGate";

/** Todas las rutas de Finanzas pasan por el interruptor del módulo y el permiso `billing`. */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <FinanceGate>{children}</FinanceGate>;
}
