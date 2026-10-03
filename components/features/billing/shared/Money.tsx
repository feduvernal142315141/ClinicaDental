import { cn } from "@/lib/utils/utils";
import { formatMoney } from "@/lib/utils/billing-currency";

interface MoneyProps {
  amount: number | null | undefined;
  currency: string;
  className?: string;
  /** Colorea según el signo del saldo: rojo si debe (> 0), verde si a favor (< 0). */
  balanceTone?: boolean;
}

/** Monto con su moneda, en cifras tabulares (alineadas en columnas). */
export function Money({ amount, currency, className, balanceTone }: MoneyProps) {
  const tone =
    balanceTone && amount
      ? amount > 0
        ? "text-rose-700 dark:text-rose-300"
        : "text-emerald-700 dark:text-emerald-300"
      : undefined;
  return <span className={cn("tabular-nums", tone, className)}>{formatMoney(amount, currency)}</span>;
}
