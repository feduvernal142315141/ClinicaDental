"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ReceiptText } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { Alert, AlertDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/entity/billing";
import { useBillingPermissions, useInvoiceList } from "@/lib/hooks/billing";
import { useDebouncedValue } from "@/lib/hooks/billing/use-debounced-value";
import { billingErrorMessage } from "@/lib/services/billing";
import { InvoiceStatusBadge } from "../shared/BillingBadges";
import { BillingPager } from "../shared/BillingPager";
import { LinkButton } from "../shared/LinkButton";
import { ALL_STATUSES, ListFilters, type PatientFilterValue } from "../shared/ListFilters";
import { Money } from "../shared/Money";
import { formatBillingDate } from "../shared/billing-format";
import { TableSkeleton } from "../shared/BillingSkeletons";

const PAGE_SIZE = 20;

/** D. Lista de recibos con filtros (estado, paciente, búsqueda, rango de fechas). */
export function InvoiceList({ initialPatient }: { initialPatient?: PatientFilterValue | null }) {
  const router = useRouter();
  const permissions = useBillingPermissions();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [patient, setPatient] = useState<PatientFilterValue | null>(initialPatient ?? null);
  const [range, setRange] = useState({ from: "", to: "" });
  const debouncedQ = useDebouncedValue(q);

  const query = {
    page,
    pageSize: PAGE_SIZE,
    q: debouncedQ.trim() || undefined,
    status: status === ALL_STATUSES ? undefined : (status as InvoiceStatus),
    patientId: patient?.id,
    from: range.from || undefined,
    to: range.to || undefined,
  };
  const { data, isPending, isError, error, isFetching } = useInvoiceList(query);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title="Recibos"
        description="Documentos no fiscales emitidos al paciente: lo que debe y lo que ya pagó."
        action={
          permissions.canCreate ? (
            <LinkButton href="/billing/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo recibo
            </LinkButton>
          ) : undefined
        }
      />

      <ListFilters
        search={{ value: q, onChange: resetPage(setQ), placeholder: "Código o paciente" }}
        status={{
          value: status,
          onChange: resetPage(setStatus),
          options: Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
        }}
        patient={{ value: patient, onChange: resetPage(setPatient) }}
        range={{ ...range, onChange: resetPage(setRange) }}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <TableSkeleton columns={7} label="Cargando recibos…" />
      ) : data && data.entities.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          variant="card"
          title="Sin recibos"
          description={
            q || patient || status !== ALL_STATUSES || range.from || range.to
              ? "Ningún recibo coincide con los filtros."
              : "Aún no se ha emitido ningún recibo."
          }
        />
      ) : data ? (
        <div className="bento overflow-x-auto p-0" aria-busy={isFetching}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Emitido</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entities.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/billing/invoices/${invoice.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/billing/invoices/${invoice.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium text-brand hover:underline"
                    >
                      {invoice.code}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.patientName ?? "—"}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>{formatBillingDate(invoice.issuedAt)}</TableCell>
                  <TableCell>{formatBillingDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Money amount={invoice.total} currency={invoice.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={invoice.status === "VOID" ? 0 : invoice.balance} currency={invoice.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 pb-3">
            <BillingPager pagination={data.pagination} onPageChange={setPage} noun="recibos" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
