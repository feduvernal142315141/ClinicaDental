"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileCheck2,
  Printer,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { useEstimates } from "@/lib/hooks/billing/useEstimates";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { formatMoney } from "@/lib/utils/billing-currency";
import { EstimateStatusBadge } from "../shared/InvoiceStatusBadge";
import type { EstimateResponse } from "@/lib/entity/billing";
import dayjs from "dayjs";

interface EstimateDetailProps {
  estimateId: string;
  patientId?: string;
}

export function EstimateDetail({ estimateId, patientId }: EstimateDetailProps) {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const canEdit = isAdmin || can("billing", PermissionAction.EDIT);
  const canCreate = isAdmin || can("billing", PermissionAction.CREATE);
  const { getEstimateById, updateEstimateStatus, convertEstimate, loading } =
    useEstimates();

  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    const data = await getEstimateById(estimateId);
    setEstimate(data);
  }, [estimateId, getEstimateById]);

  useEffect(() => {
    void load();
  }, [load]);

  const backPatientId = patientId ?? estimate?.patientId;

  const handlePrint = () => {
    window.print();
  };

  const handleSend = async () => {
    if (!estimate) return;
    const updated = await updateEstimateStatus(estimate.id, { status: "SENT" });
    setEstimate(updated);
  };

  const handleAcceptAndConvert = async () => {
    if (!estimate) return;
    setConverting(true);
    try {
      if (estimate.status === "DRAFT" || estimate.status === "SENT") {
        await updateEstimateStatus(estimate.id, { status: "ACCEPTED" });
      }
      const result = await convertEstimate(estimate.id);
      setEstimate(result.estimate);
      router.push(
        `/patients/${result.invoice.patientId}?tab=cuenta`,
      );
    } finally {
      setConverting(false);
    }
  };

  if (loading && !estimate) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando presupuesto…" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="bento p-6 text-center text-sm text-subtle">
        Presupuesto no encontrado.
      </div>
    );
  }

  const canConvert =
    canCreate &&
    estimate.status !== "CONVERTED" &&
    estimate.status !== "REJECTED" &&
    estimate.status !== "EXPIRED";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            backPatientId
              ? router.push(`/patients/${backPatientId}?tab=cuenta`)
              : router.push("/billing")
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          {canEdit && estimate.status === "DRAFT" && (
            <Button type="button" variant="outline" onClick={handleSend}>
              <Send className="h-4 w-4" />
              Marcar enviado
            </Button>
          )}
          {canConvert && (
            <Button
              type="button"
              onClick={() => void handleAcceptAndConvert()}
              disabled={converting}
            >
              <FileCheck2 className="h-4 w-4" />
              {converting ? "Generando…" : "Aceptar y facturar"}
            </Button>
          )}
        </div>
      </div>

      <section className="bento space-y-5 p-5 lg:p-6 print:border-0 print:shadow-none">
        <div className="flex flex-col gap-2 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs text-subtle">{estimate.code}</p>
            <h1 className="text-xl font-semibold text-ink">Presupuesto</h1>
            <p className="text-sm text-subtle">
              Emitido {dayjs(estimate.createdAt).format("DD/MM/YYYY")}
              {estimate.validUntil
                ? ` · válido hasta ${dayjs(estimate.validUntil).format("DD/MM/YYYY")}`
                : ""}
            </p>
          </div>
          <EstimateStatusBadge status={estimate.status} />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-subtle">
              <th className="py-2 pr-2 font-medium">Descripción</th>
              <th className="py-2 pr-2 font-medium">Diente</th>
              <th className="py-2 pr-2 text-right font-medium">Cant.</th>
              <th className="py-2 pr-2 text-right font-medium">Precio</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {estimate.items.map((item) => (
              <tr key={item.id} className="border-b border-hairline/70">
                <td className="py-2.5 pr-2 text-ink">{item.description}</td>
                <td className="py-2.5 pr-2 text-subtle">
                  {item.toothRef || "—"}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-ink">
                  {item.quantity}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-ink">
                  {formatMoney(item.unitPrice, estimate.currency)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-ink">
                  {formatMoney(item.total, estimate.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-subtle">
            <span>Subtotal</span>
            <span className="tabular-nums text-ink">
              {formatMoney(estimate.subtotal, estimate.currency)}
            </span>
          </div>
          {estimate.discount > 0 && (
            <div className="flex justify-between text-subtle">
              <span>Descuento</span>
              <span className="tabular-nums text-ink">
                −{formatMoney(estimate.discount, estimate.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney(estimate.total, estimate.currency)}
            </span>
          </div>
        </div>

        {estimate.notes && (
          <div className="rounded-bento border border-hairline bg-canvas/50 p-3 text-sm text-subtle">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink">
              Notas
            </p>
            {estimate.notes}
          </div>
        )}

        {estimate.invoiceId && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Este presupuesto ya fue convertido a factura.
          </p>
        )}
      </section>
    </div>
  );
}
