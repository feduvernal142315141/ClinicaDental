"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { CashSessionResponse } from "@/lib/entity/billing";
import { amountSchema } from "@/lib/entity/billing/schemas";
import { billingErrorMessage, isConflictError, isModuleDisabledError } from "@/lib/services/billing";
import { roundMoney } from "@/lib/utils/billing-currency";
import { billingKeys } from "./billing-query-keys";
import { useCloseCashSession, useOpenCashSession } from "./use-billing-mutations";

const notesSchema = z.string().max(500, "Las notas admiten como máximo 500 caracteres.").optional();

const openSchema = z.object({ openingFloat: amountSchema({ label: "El fondo inicial" }), notes: notesSchema });
const closeSchema = z.object({ countedCash: amountSchema({ label: "El efectivo contado" }), notes: notesSchema });

type OpenInput = z.input<typeof openSchema>;
type CloseInput = z.input<typeof closeSchema>;

/** "Abrir caja": pide el fondo inicial. */
export function useOpenCashForm({ open, onSuccess }: { open: boolean; onSuccess?: (session: CashSessionResponse) => void }) {
  const mutation = useOpenCashSession();
  const form = useForm<OpenInput, unknown, z.output<typeof openSchema>>({
    resolver: zodResolver(openSchema),
    mode: "onBlur",
    defaultValues: { openingFloat: 0, notes: "" },
  });

  useEffect(() => {
    if (open) form.reset({ openingFloat: 0, notes: "" });
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    try {
      const session = await mutation.mutateAsync({
        openingFloat: values.openingFloat,
        notes: values.notes?.trim() || undefined,
      });
      onSuccess?.(session);
    } catch (error) {
      if (!isModuleDisabledError(error)) form.setError("root", { message: billingErrorMessage(error) });
    }
  });

  return { form, submit, submitting: mutation.isPending };
}

/**
 * "Cerrar caja": pide lo contado, muestra la diferencia (contado − esperado) antes de confirmar
 * y envía la `version` vigente. Si otro usuario movió la caja (409), recarga la caja para volver
 * a contar sobre el esperado actualizado.
 */
export function useCloseCashForm({
  session,
  onSuccess,
}: {
  session: CashSessionResponse | null;
  onSuccess?: (session: CashSessionResponse) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useCloseCashSession();
  const form = useForm<CloseInput, unknown, z.output<typeof closeSchema>>({
    resolver: zodResolver(closeSchema),
    mode: "onBlur",
    defaultValues: { countedCash: undefined as unknown as number, notes: "" },
  });

  useEffect(() => {
    if (session) form.reset({ countedCash: undefined as unknown as number, notes: "" });
    // Solo al abrir el diálogo para una caja concreta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const counted = useWatch({ control: form.control, name: "countedCash" });
  const difference =
    session && counted !== undefined && Number.isFinite(Number(counted))
      ? roundMoney(Number(counted) - session.expectedCash)
      : null;

  const submit = form.handleSubmit(async (values) => {
    if (!session) return;
    form.clearErrors("root");
    try {
      const closed = await mutation.mutateAsync({
        id: session.id,
        data: { countedCash: values.countedCash, notes: values.notes?.trim() || undefined, version: session.version },
      });
      onSuccess?.(closed);
    } catch (error) {
      if (isModuleDisabledError(error)) return;
      form.setError("root", { message: billingErrorMessage(error) });
      if (isConflictError(error)) {
        await queryClient.invalidateQueries({ queryKey: billingKeys.cashCurrent() });
      }
    }
  });

  return { form, submit, submitting: mutation.isPending, difference };
}
