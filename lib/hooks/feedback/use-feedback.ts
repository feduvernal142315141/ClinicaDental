"use client";

import { useState, useCallback } from "react";
import { feedbackService } from "@/lib/services/feedback";
import type {
  FeedbackTicketSummary,
  FeedbackTicket,
  FeedbackQueryParams,
  FeedbackStatus,
  FeedbackType,
  PaginatedFeedbackResponse,
} from "@/lib/entity/feedback";

interface FeedbackFilters {
  status?: FeedbackStatus;
  type?: FeedbackType;
  page?: number;
  pageSize?: number;
}

/**
 * Hook para listar y consultar tickets de feedback del usuario actual.
 * Convierte filtros simples al dialecto standard del backend (campo__op__valor).
 */
export function useFeedback() {
  const [tickets, setTickets] = useState<FeedbackTicketSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (filters?: FeedbackFilters) => {
    setLoading(true);
    setError(null);
    try {
      // Convertir filtros simples al dialecto standard
      const params: FeedbackQueryParams = {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        filters: [],
        orders: ["createAt__desc"],
      };

      if (filters?.status) {
        params.filters!.push(`status__eq__${filters.status}`);
      }
      if (filters?.type) {
        params.filters!.push(`type__eq__${filters.type}`);
      }

      const data: PaginatedFeedbackResponse =
        await feedbackService.getMyTickets(params);
      setTickets(data.entities);
      setPagination(data.pagination);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar reportes";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carga detalle sin tocar el loading del listado (evita parpadeo en Soporte). */
  const fetchTicketById = useCallback(
    async (id: string): Promise<FeedbackTicket | null> => {
      setError(null);
      try {
        return await feedbackService.getTicketById(id);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al cargar reporte";
        setError(msg);
        return null;
      }
    },
    [],
  );

  return {
    tickets,
    pagination,
    loading,
    error,
    fetchTickets,
    fetchTicketById,
  };
}
