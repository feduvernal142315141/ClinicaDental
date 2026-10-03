"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/entity/billing";
import { useFinanceDashboard } from "@/lib/hooks/billing";
import { useChartPalette } from "@/lib/hooks/dashboard/use-chart-palette";
import { billingErrorMessage } from "@/lib/services/billing";
import { dateToLocalDate, localTodayInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils/billing-currency";
import { Money } from "../shared/Money";

const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;

function currentMonth() {
  const now = new Date();
  return { from: dateToLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localTodayInput() };
}

function rangeError(from: string, to: string): string | null {
  if (!from || !to) return "Indica las dos fechas.";
  const days = (new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()) / DAY_MS;
  if (days < 0) return "La fecha inicial debe ser anterior a la final.";
  if (days > MAX_RANGE_DAYS) return "El rango debe ser válido y de hasta 366 días.";
  return null;
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bento p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{children}</p>
    </div>
  );
}

/** I. Dashboard de Finanzas: KPIs del rango (mes en curso por defecto) y cobrado por método. */
export function FinanceDashboard() {
  const [range, setRange] = useState(currentMonth);
  const error = rangeError(range.from, range.to);
  const dashboard = useFinanceDashboard(error ? {} : range, { enabled: !error });
  const palette = useChartPalette();
  const data = dashboard.data;

  const byMethod = data
    ? Object.entries(data.collectedByMethod)
        .filter(([, amount]) => amount > 0)
        .map(([method, amount]) => ({
          method: PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method,
          amount,
        }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  return (
    <div className="space-y-4">
      <div className="bento flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="space-y-1.5">
          <Label htmlFor="dash-from" className="text-xs text-subtle">
            Desde
          </Label>
          <Input
            id="dash-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-to" className="text-xs text-subtle">
            Hasta
          </Label>
          <Input
            id="dash-to"
            type="date"
            value={range.to}
            min={range.from}
            max={localTodayInput()}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        {error && <p className="pb-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>

      {dashboard.isError && (
        <Alert variant="destructive">
          <AlertDescription>{billingErrorMessage(dashboard.error)}</AlertDescription>
        </Alert>
      )}

      {dashboard.isPending && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-bento" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Emitido">
              <Money amount={data.issuedTotal} currency={data.currency} />
            </Kpi>
            <Kpi label="Descuentos">
              <Money amount={data.discountTotal} currency={data.currency} />
            </Kpi>
            <Kpi label="Cobrado">
              <Money amount={data.collectedTotal} currency={data.currency} />
            </Kpi>
            <Kpi label="Devuelto">
              <Money amount={data.refundedTotal} currency={data.currency} />
            </Kpi>
            <Kpi label="Por cobrar">
              <Money amount={data.outstandingTotal} currency={data.currency} />
            </Kpi>
            <Kpi label="Recibos emitidos">
              <span className="tabular-nums">{data.documentsIssued}</span>
            </Kpi>
            <Kpi label="Pagos">
              <span className="tabular-nums">{data.paymentsCount}</span>
            </Kpi>
            <Kpi label="Cargos pendientes">
              <span className="tabular-nums">{data.pendingCharges}</span>
            </Kpi>
          </div>

          <section className="bento space-y-3 p-5" aria-labelledby="collected-by-method">
            <h3 id="collected-by-method" className="text-sm font-semibold text-ink">
              Cobrado por método ({data.currency})
            </h3>
            {byMethod.length === 0 ? (
              <p className="text-sm text-subtle">Sin cobros en el período.</p>
            ) : (
              <>
                <div className="h-56" role="img" aria-label="Gráfico de barras: cobrado por método de pago">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byMethod} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 8 }}>
                      <CartesianGrid horizontal={false} stroke={palette.grid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="method"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: palette.axis, fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--hover)" }}
                        formatter={(value) => [formatMoney(Number(value), data.currency), "Cobrado"]}
                        contentStyle={{
                          background: palette.tooltipBg,
                          border: `1px solid ${palette.tooltipBorder}`,
                          color: palette.tooltipText,
                          borderRadius: 12,
                        }}
                        labelStyle={{ color: palette.tooltipText }}
                        itemStyle={{ color: palette.tooltipText }}
                      />
                      <Bar dataKey="amount" fill={palette.brand} radius={[0, 4, 4, 0]} barSize={18}>
                        <LabelList
                          dataKey="amount"
                          position="right"
                          formatter={(value: unknown) => formatMoney(Number(value), data.currency)}
                          style={{ fill: palette.tooltipText, fontSize: 12 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Vista en tabla del mismo dato (lectores de pantalla e impresión). */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Cobrado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byMethod.map((row) => (
                      <TableRow key={row.method}>
                        <TableCell>{row.method}</TableCell>
                        <TableCell className="text-right">
                          <Money amount={row.amount} currency={data.currency} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
