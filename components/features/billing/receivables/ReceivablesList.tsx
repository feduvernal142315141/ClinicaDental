"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-display/data-table";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { useReceivables } from "@/lib/hooks/billing/useReceivables";
import { formatMoney } from "@/lib/utils/billing-currency";
import { getReceivablesColumns } from "../table/receivables-table.config";
import type { ReceivableListItem } from "@/lib/entity/billing";

export function ReceivablesList() {
  const router = useRouter();
  const { loading, receivables, pagination, fetchReceivables } =
    useReceivables();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  useEffect(() => {
    void fetchReceivables({
      page: 0,
      pageSize: pageSizeRef.current,
      q: debouncedSearch.trim() || undefined,
    });
  }, [debouncedSearch, fetchReceivables]);

  const openAccount = (item: ReceivableListItem) => {
    router.push(`/patients/${item.patientId}?tab=cuenta`);
  };

  const columns = useMemo(
    () => getReceivablesColumns({ onOpenAccount: openAccount }),
    // router is stable; openAccount closes over it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const totalPending = receivables.reduce((sum, r) => sum + r.balance, 0);
  const currency = receivables[0]?.currency ?? "USD";

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Por cobrar</h2>
          <p className="text-sm text-subtle">
            Pacientes con saldo pendiente. Abre la cuenta para registrar un
            pago.
          </p>
        </div>
        {pagination.total > 0 && (
          <p className="text-sm text-subtle">
            Total listado:{" "}
            <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
              {formatMoney(totalPending, currency)}
            </span>
            <span className="mx-1.5 text-hairline">·</span>
            {pagination.total} paciente
            {pagination.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <TableSearch
        value={search}
        onChange={setSearch}
        placeholder="Buscar paciente…"
      />

      <DataTable
        columns={columns}
        data={receivables}
        loading={loading}
        rowKey="patientId"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger
        emptyText="No hay saldos pendientes. ¡Todo al día!"
        onPageChange={(page, pageSize) => {
          void fetchReceivables({
            page: page - 1,
            pageSize,
            q: search.trim() || undefined,
          });
        }}
      />
    </section>
  );
}
