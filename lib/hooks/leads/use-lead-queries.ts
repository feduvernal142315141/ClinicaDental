"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { LeadFilters, LeadListQuery } from "@/lib/entity/leads";
import { leadsService } from "@/lib/services/leads";
import { leadKeys } from "./lead-query-keys";

export function useLeadList(query: LeadListQuery, enabled = true) {
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: () => leadsService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLeadPipeline(filters: LeadFilters, enabled = true) {
  return useQuery({
    queryKey: leadKeys.pipeline(filters),
    queryFn: () => leadsService.pipeline(filters),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Conteos sin filtros para el contador del menú: en silencio y sin reintentos. */
export function useLeadAttentionPipeline(enabled: boolean) {
  return useQuery({
    queryKey: leadKeys.pipeline({}),
    queryFn: () => leadsService.pipeline({}, { silent: true }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLeadDetail(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? ""),
    queryFn: () => leadsService.get(id as string),
    enabled: !!id,
    retry: false,
  });
}

export function useLeadActivity(id: string | undefined, page: number, pageSize = 10) {
  return useQuery({
    queryKey: [...leadKeys.activity(id ?? "", page), pageSize] as const,
    queryFn: () => leadsService.activity(id as string, page, pageSize),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export function useLeadByConversation(conversationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: leadKeys.byConversation(conversationId ?? ""),
    queryFn: () => leadsService.byConversation(conversationId as string),
    enabled: enabled && !!conversationId,
    retry: false,
    staleTime: 15_000,
  });
}

/** Prospectos abiertos y pacientes con ese teléfono o correo (aviso antes de crear). */
export function useLeadMatches(phone: string, email: string, enabled = true) {
  const p = phone.trim();
  const e = email.trim();
  return useQuery({
    queryKey: leadKeys.matches(p, e),
    queryFn: () => leadsService.matches({ phone: p || undefined, email: e || undefined }),
    enabled: enabled && (p.length >= 4 || e.includes("@")),
    retry: false,
    staleTime: 15_000,
  });
}
