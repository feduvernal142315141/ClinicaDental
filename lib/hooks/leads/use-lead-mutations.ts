"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BookLeadRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  LeadConsentStatus,
  LeadFromConversationRequest,
  LeadOpenStage,
  LoseLeadRequest,
  ResolvePatientMatchRequest,
  ScheduleFollowUpRequest,
  UpdateLeadRequest,
} from "@/lib/entity/leads";
import { leadsService } from "@/lib/services/leads";
import { leadKeys } from "./lead-query-keys";

/**
 * Escrituras del módulo. Tras cualquiera se invalidan todas las lecturas de `["leads"]`
 * (tablero, lista, ficha, línea de tiempo, panel de la bandeja): la UI vuelve a pintar lo
 * que dice el backend, sin calcular estados por su cuenta.
 */
function useLeadMutation<TVariables, TResult>(fn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useCreateLead() {
  return useLeadMutation((data: CreateLeadRequest) => leadsService.create(data));
}

export function useUpdateLead() {
  return useLeadMutation(({ id, data }: { id: string; data: UpdateLeadRequest }) => leadsService.update(id, data));
}

export function useChangeLeadStage() {
  return useLeadMutation(({ id, stage }: { id: string; stage: LeadOpenStage }) => leadsService.changeStage(id, stage));
}

export function useAddLeadNote() {
  return useLeadMutation(({ id, note }: { id: string; note: string }) => leadsService.addNote(id, note));
}

export function useSetLeadConsent() {
  return useLeadMutation(
    ({ id, status, note }: { id: string; status: Exclude<LeadConsentStatus, "UNKNOWN">; note?: string }) =>
      leadsService.setConsent(id, status, note),
  );
}

export function useScheduleFollowUp() {
  return useLeadMutation(({ id, data }: { id: string; data: ScheduleFollowUpRequest }) =>
    leadsService.scheduleFollowUp(id, data),
  );
}

export function useCompleteFollowUp() {
  return useLeadMutation(({ id, followUpId, note }: { id: string; followUpId: string; note?: string }) =>
    leadsService.completeFollowUp(id, followUpId, note),
  );
}

export function useCancelFollowUp() {
  return useLeadMutation(({ id, followUpId, note }: { id: string; followUpId: string; note?: string }) =>
    leadsService.cancelFollowUp(id, followUpId, note),
  );
}

export function useAssignLead() {
  return useLeadMutation(({ id, userId }: { id: string; userId: string | null }) => leadsService.assign(id, userId));
}

export function useLoseLead() {
  return useLeadMutation(({ id, data }: { id: string; data: LoseLeadRequest }) => leadsService.lose(id, data));
}

export function useReopenLead() {
  return useLeadMutation((id: string) => leadsService.reopen(id));
}

export function useArchiveLead() {
  return useLeadMutation((id: string) => leadsService.archive(id));
}

export function useLeadFromConversation() {
  return useLeadMutation((data: LeadFromConversationRequest) => leadsService.fromConversation(data));
}

export function useBookLead() {
  return useLeadMutation(({ id, data }: { id: string; data: BookLeadRequest }) => leadsService.book(id, data));
}

export function useConvertLead() {
  return useLeadMutation(({ id, data }: { id: string; data?: ConvertLeadRequest }) => leadsService.convert(id, data));
}

export function useResolvePatientMatch() {
  return useLeadMutation(({ id, data }: { id: string; data: ResolvePatientMatchRequest }) =>
    leadsService.resolvePatientMatch(id, data),
  );
}
