"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { patientsService } from "@/lib/services/patients/patients.service";
import { servicesService } from "@/lib/services/services";
import { servicesQuery } from "@/lib/query/domains/services";

/**
 * Catálogos que Finanzas consume de otros módulos (pacientes y servicios).
 * No viven bajo `["billing"]`: no se descartan cuando se apaga el módulo.
 */

export interface PatientOption {
  id: string;
  name: string;
  phone?: string | null;
}

/** Búsqueda de pacientes activos (mínimo 2 caracteres). */
export function usePatientSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["billing-catalog", "patients", q],
    queryFn: async (): Promise<PatientOption[]> => {
      const page = await patientsService.getPatients({ q, page: 1, pageSize: 20, active: true });
      return (page.entities ?? []).map((patient) => ({
        id: patient.id,
        name: patient.name,
        phone: patient.phone ?? null,
      }));
    },
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  /** Costo del catálogo: precio sugerido (editable) de la línea. */
  cost: number;
}

/** Catálogo de servicios activos, por nombre (máx. 100, el techo del backend). */
export function useServiceCatalog(enabled = true) {
  return useQuery({
    queryKey: ["billing-catalog", "services"],
    queryFn: async (): Promise<ServiceOption[]> => {
      const { filters, orders } = servicesQuery().active(true).order("name", "asc").build();
      const page = await servicesService.getServices({ filters, orders, pageSize: 100 });
      return page.entities.map((service) => ({
        id: service.id,
        code: service.code,
        name: service.name,
        cost: service.cost,
      }));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}
