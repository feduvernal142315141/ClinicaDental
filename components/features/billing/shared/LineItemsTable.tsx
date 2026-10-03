import { Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { BillingLineItem } from "@/lib/entity/billing";
import { Money } from "./Money";

/** Líneas de un presupuesto o recibo (solo lectura, también para el imprimible). */
export function LineItemsTable({ items, currency }: { items: BillingLineItem[]; currency: string }) {
  const hasDiscount = items.some((item) => item.discount > 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descripción</TableHead>
          <TableHead>Pieza</TableHead>
          <TableHead className="text-right">Cant.</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          {hasDiscount && <TableHead className="text-right">Descuento</TableHead>}
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <span className="font-medium text-ink">{item.description}</span>
              {item.serviceCode && <span className="ml-2 text-xs text-subtle">{item.serviceCode}</span>}
              {item.chargeId && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-subtle print:hidden">
                  <Link2 className="h-3 w-3" /> Cargo
                </span>
              )}
            </TableCell>
            <TableCell>{item.toothRef ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
            <TableCell className="text-right">
              <Money amount={item.unitPrice} currency={currency} />
            </TableCell>
            {hasDiscount && (
              <TableCell className="text-right">
                {item.discount > 0 ? <Money amount={item.discount} currency={currency} /> : "—"}
              </TableCell>
            )}
            <TableCell className="text-right font-medium">
              <Money amount={item.total} currency={currency} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
