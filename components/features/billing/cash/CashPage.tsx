"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Unlock, Wallet } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import {
  useBillingPermissions,
  useCashSessionHistory,
  useCurrentCashSession,
  useFinanceSettings,
} from "@/lib/hooks/billing";
import { billingErrorMessage } from "@/lib/services/billing";
import { BillingPager } from "../shared/BillingPager";
import { Money } from "../shared/Money";
import { formatBillingDateTime, formatBillingTime } from "../shared/billing-format";
import { CloseCashDialog, OpenCashDialog } from "./CashDialogs";
import { LinesSkeleton, TableSkeleton } from "../shared/BillingSkeletons";

function Figure({ label, children, emphasis }: { label: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
      <p className={emphasis ? "text-2xl font-semibold text-ink" : "text-lg font-medium text-ink"}>{children}</p>
    </div>
  );
}

/** G. Caja: la actual en vivo (cada 30 s y al volver el foco), abrir/cerrar e historial. */
export function CashPage({ openOnLoad = false }: { openOnLoad?: boolean }) {
  const permissions = useBillingPermissions();
  const settings = useFinanceSettings();
  const current = useCurrentCashSession({ live: true });
  const [historyPage, setHistoryPage] = useState(0);
  const history = useCashSessionHistory({ page: historyPage, pageSize: 10 }, { enabled: permissions.canViewCashHistory });
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  // "Abrir caja" desde el Resumen llega con ?open=1.
  useEffect(() => {
    if (openOnLoad && permissions.canOpenCash && current.isSuccess && !current.data) setOpening(true);
  }, [openOnLoad, permissions.canOpenCash, current.isSuccess, current.data]);

  const session = current.data;
  const otherCurrencies = Object.entries(session?.otherCurrencies ?? {}).filter(([, amount]) => amount !== 0);
  const baseCurrency = settings.data?.baseCurrency ?? session?.currency ?? "NIO";

  return (
    <div className="space-y-6">
      <Header level={1} title="Caja" description="Efectivo de la clínica: fondo, cobros y devoluciones del turno." />

      {current.isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(current.error)}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="current-cash" className="bento space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="current-cash" className="flex items-center gap-2 text-base font-semibold text-ink">
            {session ? <Unlock className="h-5 w-5 text-emerald-600" /> : <LockKeyhole className="h-5 w-5 text-subtle" />}
            {current.isPending
              ? "Consultando la caja…"
              : session
                ? `Caja abierta desde ${formatBillingTime(session.openedAt)} · ${session.openedBy}`
                : "Caja cerrada"}
          </h2>
          {!current.isPending &&
            (session
              ? permissions.canCloseCash && <Button onClick={() => setClosing(true)}>Cerrar caja</Button>
              : permissions.canOpenCash && <Button onClick={() => setOpening(true)}>Abrir caja</Button>)}
        </div>

        {current.isPending ? (
          <LinesSkeleton lines={3} label="Consultando la caja…" />
        ) : session ? (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Figure label="Fondo inicial">
                <Money amount={session.openingFloat} currency={session.currency} />
              </Figure>
              <Figure label="Efectivo recibido">
                <Money amount={session.cashIn} currency={session.currency} />
              </Figure>
              <Figure label="Efectivo devuelto">
                <Money amount={session.cashOut} currency={session.currency} />
              </Figure>
              <Figure label="Esperado" emphasis>
                <Money amount={session.expectedCash} currency={session.currency} />
              </Figure>
            </div>
            {otherCurrencies.length > 0 && (
              <div className="rounded-xl border border-hairline p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">
                  Otras monedas (no entran al arqueo)
                </p>
                <ul className="flex flex-wrap gap-4 text-sm">
                  {otherCurrencies.map(([currency, amount]) => (
                    <li key={currency}>
                      <Money amount={amount} currency={currency} className="font-medium text-ink" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-subtle">Se actualiza sola cada 30 segundos y al volver a esta pestaña.</p>
          </>
        ) : (
          <p className="text-sm text-subtle">
            No hay caja abierta.{" "}
            {settings.data?.requireCashSession
              ? "La clínica exige caja abierta para cobrar en efectivo."
              : "Los cobros en efectivo se registran igual, sin arqueo."}
          </p>
        )}
      </section>

      {permissions.canViewCashHistory && (
        <section aria-labelledby="cash-history" className="space-y-3">
          <h2 id="cash-history" className="text-base font-semibold text-ink">
            Historial de cajas
          </h2>
          {history.isError && (
            <Alert variant="destructive">
              <AlertDescription>{billingErrorMessage(history.error)}</AlertDescription>
            </Alert>
          )}
          {history.isPending ? (
            <TableSkeleton columns={5} rows={4} label="Cargando historial de cajas…" />
          ) : history.data && history.data.entities.length === 0 ? (
            <EmptyState icon={Wallet} variant="card" title="Sin cajas registradas" />
          ) : history.data ? (
            <div className="bento overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.entities.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p>{formatBillingDateTime(item.openedAt)}</p>
                        <p className="text-xs text-subtle">{item.openedBy}</p>
                      </TableCell>
                      <TableCell>
                        {item.status === "OPEN" ? (
                          <span className="text-emerald-700 dark:text-emerald-300">Abierta</span>
                        ) : (
                          <>
                            <p>{formatBillingDateTime(item.closedAt)}</p>
                            <p className="text-xs text-subtle">{item.closedBy ?? "—"}</p>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money amount={item.expectedCash} currency={item.currency} />
                      </TableCell>
                      <TableCell className="text-right">
                        {item.countedCash != null ? <Money amount={item.countedCash} currency={item.currency} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.difference != null ? (
                          <Money
                            amount={item.difference}
                            currency={item.currency}
                            className={
                              item.difference < 0
                                ? "text-rose-700 dark:text-rose-300"
                                : item.difference > 0
                                  ? "text-amber-700 dark:text-amber-300"
                                  : undefined
                            }
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 pb-3">
                <BillingPager pagination={history.data.pagination} onPageChange={setHistoryPage} noun="cajas" />
              </div>
            </div>
          ) : null}
        </section>
      )}

      <OpenCashDialog open={opening} onOpenChange={setOpening} currency={baseCurrency} />
      {/* La caja que recibe es la viva: tras un 409 llega con la nueva versión y el nuevo esperado. */}
      <CloseCashDialog session={closing ? session ?? null : null} onOpenChange={setClosing} />
    </div>
  );
}
