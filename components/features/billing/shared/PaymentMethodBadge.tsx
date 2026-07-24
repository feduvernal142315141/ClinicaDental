import { cn } from "@/lib/utils/utils";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/entity/billing";
import { Banknote, CreditCard, Landmark, Wallet, MoreHorizontal } from "lucide-react";

const METHOD_STYLE: Record<PaymentMethod, string> = {
  CASH: "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300",
  CARD_POS: "bg-brand/10 text-brand ring-brand/20",
  TRANSFER: "bg-cyan-500/15 text-cyan-700 ring-cyan-400/25 dark:text-cyan-300",
  ADVANCE: "bg-violet-500/15 text-violet-700 ring-violet-400/25 dark:text-violet-300",
  OTHER: "bg-hover text-subtle ring-hairline",
};

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  CARD_POS: CreditCard,
  TRANSFER: Landmark,
  ADVANCE: Wallet,
  OTHER: MoreHorizontal,
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const Icon = METHOD_ICON[method];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        METHOD_STYLE[method],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
