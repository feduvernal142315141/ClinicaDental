"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from "@/components/ui";
import type { CashSessionResponse } from "@/lib/entity/billing";
import { useCloseCashForm, useOpenCashForm } from "@/lib/hooks/billing/use-cash-forms";
import { formatMoney } from "@/lib/utils/billing-currency";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { NumberInput } from "../shared/NumberInput";

export function OpenCashDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}) {
  const { form, submit, submitting } = useOpenCashForm({
    open,
    onSuccess: (session) => {
      notify.success("Caja abierta", { description: `Fondo inicial ${formatMoney(session.openingFloat, session.currency)}` });
      onOpenChange(false);
    },
  });
  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-ink">Abrir caja</DialogTitle>
          <DialogDescription className="text-subtle">
            Indica el efectivo con el que empieza la caja ({currency}). Solo puede haber una caja abierta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="openingFloat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fondo inicial</FormLabel>
                  <FormControl>
                    <NumberInput {...field} min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} placeholder="Opcional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {rootError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abrir caja
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function CloseCashDialog({
  session,
  onOpenChange,
}: {
  session: CashSessionResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { form, submit, submitting, difference } = useCloseCashForm({
    session,
    onSuccess: (closed) => {
      notify.success("Caja cerrada", {
        description:
          closed.difference && closed.difference !== 0
            ? `Diferencia ${formatMoney(closed.difference, closed.currency)}`
            : "Sin diferencia",
      });
      onOpenChange(false);
    },
  });
  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={session !== null} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-ink">Cerrar caja</DialogTitle>
          <DialogDescription className="text-subtle">
            Cuenta el efectivo en {session?.currency}. El efectivo en otras monedas no entra al arqueo.
          </DialogDescription>
        </DialogHeader>
        {session && (
          <Form {...form}>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <dl className="flex justify-between rounded-lg bg-hover px-3 py-2 text-sm">
                <dt className="text-subtle">Esperado</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatMoney(session.expectedCash, session.currency)}</dd>
              </dl>
              <FormField
                control={form.control}
                name="countedCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo contado</FormLabel>
                    <FormControl>
                      <NumberInput {...field} min={0} placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {difference !== null && (
                <p
                  data-testid="cash-difference"
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    difference < 0
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : difference > 0
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {difference === 0
                    ? "Cuadra: sin diferencia."
                    : `${difference < 0 ? "Falta" : "Sobra"} ${formatMoney(Math.abs(difference), session.currency)}`}
                </p>
              )}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {rootError && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{rootError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cerrar caja
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
