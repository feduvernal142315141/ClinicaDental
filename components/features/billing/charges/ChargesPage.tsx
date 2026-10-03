"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ClipboardPlus, Trash2 } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { Alert, AlertDescription, Button, Checkbox } from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { CHARGE_STATUS_LABELS, type ChargeResponse, type ChargeStatus } from "@/lib/entity/billing";
import { useBillingPermissions, useChargeList, useDismissCharge } from "@/lib/hooks/billing";
import { billingErrorMessage } from "@/lib/services/billing";
import { roundMoney } from "@/lib/utils/billing-currency";
import { notify } from "@/lib/utils/notify";
import { ChargeStatusBadge } from "../shared/BillingBadges";
import { BillingPager } from "../shared/BillingPager";
import { ListFilters, type PatientFilterValue } from "../shared/ListFilters";
import { Money } from "../shared/Money";
import { ReasonDialog } from "../shared/ReasonDialog";
import { formatDayMonth } from "../shared/billing-format";
import { ManualChargeDialog } from "./ManualChargeDialog";

const PAGE_SIZE = 50;

interface PatientGroup {
  patientId: string;
  patientName: string;
  charges: ChargeResponse[];
}

function groupByPatient(charges: ChargeResponse[]): PatientGroup[] {
  const groups = new Map<string, PatientGroup>();
  for (const charge of charges) {
    const group = groups.get(charge.patientId) ?? {
      patientId: charge.patientId,
      patientName: charge.patientName ?? "Paciente",
      charges: [],
    };
    group.charges.push(charge);
    groups.set(charge.patientId, group);
  }
  return Array.from(groups.values());
}

/** "Cita del 01/10" o "Manual". */
export function chargeOrigin(charge: ChargeResponse): string {
  return charge.sourceType === "APPOINTMENT" ? `Cita del ${formatDayMonth(charge.performedAt)}` : "Manual";
}

/** H. Cargos pendientes, agrupados por paciente: "Cobrar" y "Descartar". */
export function ChargesPage() {
  const router = useRouter();
  const permissions = useBillingPermissions();
  const [status, setStatus] = useState<string>("PENDING");
  const [patient, setPatient] = useState<PatientFilterValue | null>(null);
  const [page, setPage] = useState(0);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [charging, setCharging] = useState(false);
  const [dismissing, setDismissing] = useState<ChargeResponse | null>(null);
  const dismiss = useDismissCharge();

  const { data, isPending, isError, error } = useChargeList({
    status: status === "__all__" ? undefined : (status as ChargeStatus),
    patientId: patient?.id,
    page,
    pageSize: PAGE_SIZE,
  });
  const groups = useMemo(() => groupByPatient(data?.entities ?? []), [data]);

  const bill = (group: PatientGroup) => {
    const ids = group.charges.filter((c) => c.status === "PENDING" && !excluded.includes(c.id)).map((c) => c.id);
    const name = encodeURIComponent(group.patientName);
    router.push(`/billing/invoices/new?patientId=${group.patientId}&patientName=${name}&chargeIds=${ids.join(",")}`);
  };

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title="Cargos pendientes"
        description="Servicios realizados que aún no se cobran. Se crean al completar citas o a mano."
        action={
          permissions.canCreate ? (
            <Button onClick={() => setCharging(true)}>
              <ClipboardPlus className="mr-2 h-4 w-4" />
              Cargo manual
            </Button>
          ) : undefined
        }
      />

      <ListFilters
        status={{
          value: status,
          onChange: (value) => {
            setStatus(value);
            setPage(0);
          },
          options: Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
        }}
        patient={{
          value: patient,
          onChange: (value) => {
            setPatient(value);
            setPage(0);
          },
        }}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <LoadingSpinner message="Cargando cargos..." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          variant="card"
          title={status === "PENDING" ? "No hay cargos pendientes" : "Sin cargos"}
          description={status === "PENDING" ? "Todo lo realizado ya está cobrado o descartado." : "Ningún cargo coincide con los filtros."}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const billable = group.charges.filter((c) => c.status === "PENDING" && !excluded.includes(c.id));
            const total = roundMoney(billable.reduce((sum, c) => sum + c.total, 0));
            const currency = group.charges[0]?.currency ?? "";
            return (
              <section key={group.patientId} className="bento overflow-hidden p-0" aria-label={`Cargos de ${group.patientName}`}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3">
                  <Link href={`/patients/${group.patientId}?tab=cuenta`} className="font-semibold text-ink hover:text-brand">
                    {group.patientName}
                  </Link>
                  {permissions.canCreate && billable.length > 0 && (
                    <Button size="sm" onClick={() => bill(group)}>
                      Cobrar ({billable.length}) · <Money amount={total} currency={currency} className="ml-1" />
                    </Button>
                  )}
                </header>
                <ul className="divide-y divide-hairline">
                  {group.charges.map((charge) => {
                    const pending = charge.status === "PENDING";
                    return (
                      <li key={charge.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[auto_9rem_minmax(0,1fr)_5rem_8rem_auto]">
                        {permissions.canCreate && pending ? (
                          <Checkbox
                            checked={!excluded.includes(charge.id)}
                            onCheckedChange={(value) =>
                              setExcluded((current) =>
                                value === true ? current.filter((id) => id !== charge.id) : [...current, charge.id],
                              )
                            }
                            aria-label={`Incluir ${charge.description} al cobrar`}
                          />
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="hidden text-sm text-subtle sm:block">{chargeOrigin(charge)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{charge.description}</span>
                          <span className="text-xs text-subtle sm:hidden">{chargeOrigin(charge)}</span>
                          {!pending && (
                            <span className="ml-0 sm:ml-2">
                              <ChargeStatusBadge status={charge.status} />
                            </span>
                          )}
                        </span>
                        <span className="hidden text-sm text-ink sm:block">{charge.toothRef ?? "—"}</span>
                        <Money amount={charge.total} currency={charge.currency} className="text-right text-sm font-medium" />
                        {permissions.canEdit && pending ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDismissing(charge)}
                            aria-label={`Descartar ${charge.description}`}
                            title="Descartar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="w-10" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          <BillingPager pagination={data?.pagination} onPageChange={setPage} noun="cargos" />
        </div>
      )}

      <ManualChargeDialog open={charging} onOpenChange={setCharging} />
      <ReasonDialog
        open={dismissing !== null}
        onOpenChange={(open) => !open && setDismissing(null)}
        title="Descartar cargo"
        description={dismissing ? `«${dismissing.description}» dejará de estar pendiente de cobro.` : ""}
        confirmLabel="Descartar"
        onConfirm={async (reason) => {
          if (!dismissing) return;
          await dismiss.mutateAsync({ id: dismissing.id, reason });
          notify.success("Cargo descartado", { description: dismissing.description });
        }}
      />
    </div>
  );
}
