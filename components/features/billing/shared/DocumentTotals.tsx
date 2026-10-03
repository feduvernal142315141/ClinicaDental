import { Money } from "./Money";

interface DocumentTotalsProps {
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  /** Pagado y saldo (recibos). */
  paid?: number;
  balance?: number;
  /** true en formularios: los importes son una vista previa. */
  preview?: boolean;
}

export function DocumentTotals({ subtotal, discount, total, currency, paid, balance, preview }: DocumentTotalsProps) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-subtle">Subtotal</dt>
        <dd>
          <Money amount={subtotal} currency={currency} />
        </dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">Descuento</dt>
          <dd>
            − <Money amount={discount} currency={currency} />
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-4 border-t border-hairline pt-1.5 text-base font-semibold text-ink">
        <dt>Total</dt>
        <dd>
          <Money amount={total} currency={currency} />
        </dd>
      </div>
      {paid !== undefined && (
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">Pagado</dt>
          <dd>
            <Money amount={paid} currency={currency} />
          </dd>
        </div>
      )}
      {balance !== undefined && (
        <div className="flex justify-between gap-4 font-semibold">
          <dt className="text-ink">Saldo</dt>
          <dd>
            <Money amount={balance} currency={currency} balanceTone />
          </dd>
        </div>
      )}
      {preview && (
        <p className="pt-1 text-xs text-subtle">Vista previa: al guardar se muestran los importes que calcula el sistema.</p>
      )}
    </dl>
  );
}
