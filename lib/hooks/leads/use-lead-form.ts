"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Lead, LeadMatches } from "@/lib/entity/leads";
import {
  EMPTY_LEAD_FORM,
  buildCreateLeadRequest,
  buildUpdateLeadRequest,
  isEmptyLeadUpdate,
  leadFormSchema,
  leadToFormValues,
  type LeadFormValues,
} from "@/lib/entity/leads/schemas";
import { hasLeadErrorCode, isLeadModuleDisabledError, leadErrorMessage, leadsService } from "@/lib/services/leads";
import { leadKeys } from "./lead-query-keys";
import { useCreateLead, useUpdateLead } from "./use-lead-mutations";
import { useLeadMatches } from "./use-lead-queries";

export const LEAD_VERSION_CONFLICT_MESSAGE = "Otra persona modificó este prospecto";

interface UseLeadFormOptions {
  open: boolean;
  /** Con prospecto: edición. Sin él: alta manual. */
  lead?: Lead;
  onSuccess?: (lead: Lead, mode: "created" | "updated" | "unchanged") => void;
}

/**
 * Alta manual y edición de un prospecto.
 *
 * - Alta: al salir del teléfono o del correo consulta coincidencias y avisa antes de guardar.
 *   Si el backend responde `LEAD_DUPLICATE_OPEN` (no trae el id), busca los existentes para
 *   ofrecer "Abrir el existente" o "Crear de todos modos" (`allowDuplicate`).
 * - Edición: envía solo lo que cambió y la `version` cargada. Con `LEAD_VERSION_CONFLICT`
 *   recarga el prospecto y CONSERVA lo que el usuario escribió.
 */
export function useLeadForm({ open, lead, onSuccess }: UseLeadFormOptions) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();
  const create = useCreateLead();
  const update = useUpdateLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    mode: "onBlur",
    defaultValues: lead ? leadToFormValues(lead) : EMPTY_LEAD_FORM,
  });

  const [lookup, setLookup] = useState({ phone: "", email: "" });
  const [duplicate, setDuplicate] = useState<LeadMatches | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);

  // Solo al abrir: si el prospecto se recarga por un conflicto, el formulario no se pisa.
  useEffect(() => {
    if (!open) return;
    form.reset(lead ? leadToFormValues(lead) : EMPTY_LEAD_FORM);
    setLookup({ phone: "", email: "" });
    setDuplicate(null);
    setVersionConflict(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const matches = useLeadMatches(lookup.phone, lookup.email, open && !isEdit);

  /** Se llama al salir del teléfono o del correo (solo en el alta). */
  const checkMatches = () => {
    if (isEdit) return;
    const { phone, email } = form.getValues();
    const errors = form.formState.errors;
    setLookup({ phone: errors.phone ? "" : phone.trim(), email: errors.email ? "" : email.trim() });
  };

  const submitWith = (allowDuplicate: boolean) =>
    form.handleSubmit(async (values) => {
      form.clearErrors("root");
      try {
        if (!lead) {
          const created = await create.mutateAsync(buildCreateLeadRequest(values, allowDuplicate));
          setDuplicate(null);
          onSuccess?.(created, "created");
          return;
        }
        const request = buildUpdateLeadRequest(lead, values);
        if (isEmptyLeadUpdate(request)) {
          onSuccess?.(lead, "unchanged");
          return;
        }
        const updated = await update.mutateAsync({ id: lead.id, data: request });
        setVersionConflict(false);
        onSuccess?.(updated, "updated");
      } catch (error) {
        if (isLeadModuleDisabledError(error)) return;
        if (hasLeadErrorCode(error, "LEAD_DUPLICATE_OPEN")) {
          // El 409 no trae el id: se buscan los existentes para poder abrirlos.
          try {
            setDuplicate(await leadsService.matches({ phone: values.phone, email: values.email }));
          } catch {
            setDuplicate({ openLeads: [], patients: [] });
          }
          return;
        }
        if (hasLeadErrorCode(error, "LEAD_VERSION_CONFLICT") && lead) {
          setVersionConflict(true);
          await queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead.id) });
          return;
        }
        // Se cerró o se convirtió mientras se editaba: la ficha se recarga y ofrece reabrir.
        if (lead && (hasLeadErrorCode(error, "LEAD_CLOSED") || hasLeadErrorCode(error, "LEAD_ALREADY_CONVERTED"))) {
          void queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead.id) });
        }
        form.setError("root", { message: leadErrorMessage(error) });
      }
    });

  return {
    form,
    isEdit,
    submit: submitWith(false),
    /** "Crear de todos modos": reenvía con `allowDuplicate: true`. */
    submitAllowingDuplicate: submitWith(true),
    submitting: create.isPending || update.isPending,
    checkMatches,
    matches: matches.data,
    duplicate,
    dismissDuplicate: () => setDuplicate(null),
    versionConflict,
  };
}
