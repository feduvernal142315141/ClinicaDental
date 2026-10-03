"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { Alert, AlertDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { useReceivables } from "@/lib/hooks/billing";
import { useDebouncedValue } from "@/lib/hooks/billing/use-debounced-value";
import { billingErrorMessage } from "@/lib/services/billing";
import { BillingPager } from "../shared/BillingPager";
import { ListFilters } from "../shared/ListFilters";
import { Money } from "../shared/Money";
import { formatBillingDate } from "../shared/billing-format";

const PAGE_SIZE = 20;

/** I. Por cobrar: mayor saldo primero, con antigüedad 0–30, 31–60, 61–90 y +90 días. */
export function ReceivablesReport() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const { data, isPending, isError, error } = useReceivables({ page, pageSize: PAGE_SIZE, q: debouncedQ.trim() || undefined });

  return (
    <div className="space-y-4">
      <ListFilters
        search={{
          value: q,
          onChange: (value) => {
            setQ(value);
            setPage(0);
          },
          placeholder: "Nombre del paciente",
        }}
      />
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      {isPending ? (
        <LoadingSpinner message="Cargando saldos..." />
      ) : data && data.entities.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          variant="card"
          title="Nadie debe"
          description={q ? "Ningún paciente con saldo coincide con la búsqueda." : "No hay recibos con saldo pendiente."}
        />
      ) : data ? (
        <div className="bento overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Recibos</TableHead>
                <TableHead>Vencimiento más antiguo</TableHead>
                <TableHead className="text-right">0–30</TableHead>
                <TableHead className="text-right">31–60</TableHead>
                <TableHead className="text-right">61–90</TableHead>
                <TableHead className="text-right">+90</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entities.map((row) => (
                <TableRow
                  key={row.patientId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/patients/${row.patientId}?tab=cuenta`)}
                >
                  <TableCell className="font-medium text-brand">{row.patientName ?? "Paciente"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <Money amount={row.balance} currency={row.currency} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.invoiceCount}</TableCell>
                  <TableCell>{formatBillingDate(row.oldestDueDate)}</TableCell>
                  {(["current", "days31To60", "days61To90", "over90"] as const).map((bucket) => (
                    <TableCell
                      key={bucket}
                      className={
                        bucket === "over90" && row.aging.over90 > 0
                          ? "text-right font-medium text-rose-700 dark:text-rose-300"
                          : "text-right"
                      }
                    >
                      {row.aging[bucket] > 0 ? <Money amount={row.aging[bucket]} currency={row.currency} /> : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 pb-3">
            <BillingPager pagination={data.pagination} onPageChange={setPage} noun="pacientes" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
