"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { Alert, AlertDescription, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { ESTIMATE_STATUS_LABELS, type EstimateStatus } from "@/lib/entity/billing";
import { useBillingPermissions, useEstimateList } from "@/lib/hooks/billing";
import { useDebouncedValue } from "@/lib/hooks/billing/use-debounced-value";
import { billingErrorMessage } from "@/lib/services/billing";
import { EstimateStatusBadge } from "../shared/BillingBadges";
import { BillingPager } from "../shared/BillingPager";
import { LinkButton } from "../shared/LinkButton";
import { ALL_STATUSES, ListFilters, type PatientFilterValue } from "../shared/ListFilters";
import { Money } from "../shared/Money";
import { formatBillingDate } from "../shared/billing-format";

const PAGE_SIZE = 20;

/** C. Lista de presupuestos con filtros (estado, paciente, búsqueda) y paginación. */
export function EstimateList() {
  const router = useRouter();
  const permissions = useBillingPermissions();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [patient, setPatient] = useState<PatientFilterValue | null>(null);
  const debouncedQ = useDebouncedValue(q);

  const query = {
    page,
    pageSize: PAGE_SIZE,
    q: debouncedQ.trim() || undefined,
    status: status === ALL_STATUSES ? undefined : (status as EstimateStatus),
    patientId: patient?.id,
  };
  const { data, isPending, isError, error, isFetching } = useEstimateList(query);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title="Presupuestos"
        description="Propuestas de tratamiento para el paciente. No generan deuda hasta convertirlas en recibo."
        action={
          permissions.canCreate ? (
            <LinkButton href="/billing/estimates/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo presupuesto
            </LinkButton>
          ) : undefined
        }
      />

      <ListFilters
        search={{ value: q, onChange: resetPage(setQ), placeholder: "Código o paciente" }}
        status={{
          value: status,
          onChange: resetPage(setStatus),
          options: Object.entries(ESTIMATE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
        }}
        patient={{ value: patient, onChange: resetPage(setPatient) }}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <LoadingSpinner message="Cargando presupuestos..." />
      ) : data && data.entities.length === 0 ? (
        <EmptyState
          icon={FileText}
          variant="card"
          title="Sin presupuestos"
          description={q || patient || status !== ALL_STATUSES ? "Ningún presupuesto coincide con los filtros." : "Aún no se ha creado ningún presupuesto."}
        />
      ) : data ? (
        <div className="bento overflow-x-auto p-0" aria-busy={isFetching}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entities.map((estimate) => (
                <TableRow
                  key={estimate.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/billing/estimates/${estimate.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/billing/estimates/${estimate.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium text-brand hover:underline"
                    >
                      {estimate.code}
                    </Link>
                  </TableCell>
                  <TableCell>{estimate.patientName ?? "—"}</TableCell>
                  <TableCell>
                    <EstimateStatusBadge status={estimate.status} />
                  </TableCell>
                  <TableCell>{formatBillingDate(estimate.validUntil)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Money amount={estimate.total} currency={estimate.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 pb-3">
            <BillingPager pagination={data.pagination} onPageChange={setPage} noun="presupuestos" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
