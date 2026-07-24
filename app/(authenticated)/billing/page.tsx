"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/layout/page-header";
import { CashSummaryCards } from "@/components/features/billing/summary/CashSummaryCards";
import { useCashSummary } from "@/lib/hooks/billing/useCashSummary";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";

export default function BillingPage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const canView =
    isAdmin ||
    can("billing", PermissionAction.CREATE) ||
    can("billing", PermissionAction.EDIT);
  const { loading, summary, date, setDate } = useCashSummary();

  useEffect(() => {
    // Admin bypass. Sin claim billing aún, solo admin ve el panel.
    if (!isAdmin && !canView) {
      router.replace("/patients");
    }
  }, [isAdmin, canView, router]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Facturación"
        subtitle="Caja del día y saldos pendientes. Los cobros se anotan en la cuenta de cada paciente."
      />

      <section className="bento space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Resumen de caja</h2>
            <p className="text-sm text-subtle">
              Vista operativa. Para registrar un pago, abre la pestaña Cuenta del
              paciente.
            </p>
          </div>
          <div className="w-full sm:w-44">
            <Label htmlFor="billing-date">Fecha</Label>
            <Input
              id="billing-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <CashSummaryCards summary={summary} loading={loading} />
      </section>

      <section className="bento p-4 lg:p-5">
        <h2 className="mb-1 text-base font-semibold text-ink">
          Cómo registrar un cobro
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-subtle">
          <li>Ve a Pacientes y abre la ficha del paciente.</li>
          <li>Entra a la pestaña Cuenta.</li>
          <li>
            Pulsa Registrar pago y anota efectivo, tarjeta (POS) o transferencia.
          </li>
        </ol>
      </section>
    </div>
  );
}
