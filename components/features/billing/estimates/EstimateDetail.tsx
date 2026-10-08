"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CheckCircle2, Loader2, Pencil, Send, XCircle } from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@/components/ui";
import {
  canTransitionEstimate,
  isEstimateConvertible,
  isEstimateEditable,
  type EstimateStatusChange,
} from "@/lib/entity/billing";
import {
  useBillingPermissions,
  useChangeEstimateStatus,
  useConvertEstimate,
  useEstimate,
} from "@/lib/hooks/billing";
import { billingErrorMessage } from "@/lib/services/billing";
import { notify } from "@/lib/utils/notify";
import { EstimateStatusBadge } from "../shared/BillingBadges";
import { DocumentTotals } from "../shared/DocumentTotals";
import { LineItemsTable } from "../shared/LineItemsTable";
import { LinkButton } from "../shared/LinkButton";
import { formatBillingDate, formatBillingDateTime } from "../shared/billing-format";
import { notifyBillingError } from "../shared/billing-notify";
import { DetailSkeleton } from "../shared/BillingSkeletons";

const STATUS_ACTIONS: Array<{ status: EstimateStatusChange; label: string; icon: typeof Send }> = [
  { status: "SENT", label: "Marcar enviado", icon: Send },
  { status: "ACCEPTED", label: "Marcar aceptado", icon: CheckCircle2 },
  { status: "REJECTED", label: "Marcar rechazado", icon: XCircle },
];

/** C. Detalle de presupuesto: botones según el estado y permisos; convertir navega al recibo. */
export function EstimateDetail({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const permissions = useBillingPermissions();
  const { data: estimate, isPending, isError, error } = useEstimate(estimateId);
  const changeStatus = useChangeEstimateStatus();
  const convert = useConvertEstimate();
  const [confirmConvert, setConfirmConvert] = useState(false);

  if (isPending) return <DetailSkeleton label="Cargando presupuesto…" />;
  if (isError || !estimate) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{billingErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const busy = changeStatus.isPending || convert.isPending;

  const onStatus = async (status: EstimateStatusChange, label: string) => {
    try {
      await changeStatus.mutateAsync({ id: estimate.id, status });
      notify.success(`Presupuesto ${estimate.code}`, { description: label.replace("Marcar", "Marcado como") });
    } catch (err) {
      notifyBillingError(err, "No se pudo cambiar el estado");
    }
  };

  const onConvert = async () => {
    try {
      const { invoice } = await convert.mutateAsync(estimate.id);
      notify.success("Recibo emitido", { description: `${invoice.code} desde ${estimate.code}` });
      router.push(`/billing/invoices/${invoice.id}`);
    } catch (err) {
      notifyBillingError(err, "No se pudo convertir el presupuesto");
    } finally {
      setConfirmConvert(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={`Presupuesto ${estimate.code}`}
        description={estimate.patientName ?? undefined}
        action={<EstimateStatusBadge status={estimate.status} />}
      />

      <div className="flex flex-wrap gap-2">
        {permissions.canEdit && isEstimateEditable(estimate.status) && (
          <LinkButton href={`/billing/estimates/${estimate.id}/edit`} variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </LinkButton>
        )}
        {permissions.canEdit &&
          STATUS_ACTIONS.filter(({ status }) => canTransitionEstimate(estimate.status, status)).map(
            ({ status, label, icon: Icon }) => (
              <Button key={status} variant="outline" onClick={() => onStatus(status, label)} disabled={busy}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            ),
          )}
        {permissions.canCreate && isEstimateConvertible(estimate.status) && (
          <Button onClick={() => setConfirmConvert(true)} disabled={busy}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Convertir en recibo
          </Button>
        )}
        {estimate.invoiceId && (
          <LinkButton href={`/billing/invoices/${estimate.invoiceId}`} variant="outline">
            Ver recibo
          </LinkButton>
        )}
        <LinkButton href={`/patients/${estimate.patientId}?tab=cuenta`} variant="ghost">
          Cuenta del paciente
        </LinkButton>
      </div>

      <section className="bento grid gap-4 p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-subtle">Creado</p>
          <p className="text-ink">{formatBillingDateTime(estimate.createdAt)}</p>
        </div>
        <div>
          <p className="text-subtle">Válido hasta</p>
          <p className="text-ink">{formatBillingDate(estimate.validUntil)}</p>
        </div>
        <div>
          <p className="text-subtle">Moneda</p>
          <p className="text-ink">
            {estimate.currency}
            {estimate.exchangeRate !== 1 && <span className="text-subtle"> · tasa {estimate.exchangeRate}</span>}
          </p>
        </div>
        <div>
          <p className="text-subtle">Notas</p>
          <p className="whitespace-pre-wrap text-ink">{estimate.notes || "—"}</p>
        </div>
      </section>

      <section className="bento space-y-4 p-5">
        <LineItemsTable items={estimate.items} currency={estimate.currency} />
        <DocumentTotals
          subtotal={estimate.subtotal}
          discount={estimate.discount}
          total={estimate.total}
          currency={estimate.currency}
        />
      </section>

      <AlertDialog open={confirmConvert} onOpenChange={(open) => !convert.isPending && setConfirmConvert(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Convertir {estimate.code} en recibo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se emitirá un recibo idéntico por {estimate.total.toFixed(2)} {estimate.currency} y el paciente pasará a
              deber ese importe. Si luego se anula el recibo, el presupuesto vuelve a «Aceptado».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convert.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void onConvert();
              }}
              disabled={convert.isPending}
            >
              {convert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
