"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { patientsService } from "@/lib/services/patients/patients.service";
import { servicesService } from "@/lib/services/services";
import { servicesQuery } from "@/lib/query/domains/services";
import { patientsQuery } from "@/lib/query/domains/patients";
import { treatmentPlanItemService, treatmentPlanService } from "@/lib/services/odontogram";
import { countsTowardsPlanTotal } from "@/lib/entity/odontogram";
import type { BillingLineItemInput } from "@/lib/entity/billing";
import { clinicGeneralSettingsService } from "@/lib/services/settings/clinic-general-settings.service";

/**
 * Catálogos que Finanzas consume de otros módulos (pacientes y servicios).
 * No viven bajo `["billing"]`: no se descartan cuando se apaga el módulo.
 */

export interface PatientOption {
  id: string;
  name: string;
  phone?: string | null;
}

/**
 * Parámetros de la búsqueda de pacientes, EXACTAMENTE los de la lista de Pacientes
 * (`PatientList`): página base 0 (el backend pagina desde 0) y el filtro estructurado
 * `name` contiene, sin distinguir mayúsculas. Ordenado por nombre.
 */
export function buildPatientSearchParams(term: string) {
  const { filters, orders } = patientsQuery().search(term).orderByName("asc").build();
  return { page: 0, pageSize: 20, filters, orders };
}

/** Búsqueda de pacientes activos por nombre (mínimo 2 caracteres). */
export function usePatientSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["billing-catalog", "patients", q],
    queryFn: async (): Promise<PatientOption[]> => {
      const page = await patientsService.getPatients(buildPatientSearchParams(q));
      return (page.entities ?? [])
        // Los inactivos se descartan aquí: no se cobra a un paciente dado de baja.
        .filter((patient) => patient.active !== false)
        .map((patient) => ({
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

export interface TreatmentPlanOption {
  id: string;
  name: string;
}

/** Planes de tratamiento del paciente (no cancelados) para vincular un presupuesto. */
export function usePatientTreatmentPlans(patientId: string | undefined) {
  return useQuery({
    queryKey: ["billing-catalog", "treatment-plans", patientId],
    queryFn: async (): Promise<TreatmentPlanOption[]> => {
      const page = await treatmentPlanService.getTreatmentPlansByPatient(patientId as string, {
        page: 0,
        pageSize: 50,
      });
      return page.entities
        .filter((plan) => plan.status !== "cancelled")
        .map((plan) => ({ id: plan.id, name: plan.name }));
    },
    enabled: !!patientId,
    staleTime: 60_000,
  });
}

/**
 * Líneas de un plan convertidas en líneas de presupuesto (servicio, descripción, pieza,
 * cantidad y `unitCost`). Las canceladas no cuentan, igual que en el total del plan.
 */
export async function loadPlanLines(planId: string): Promise<BillingLineItemInput[]> {
  const { items } = await treatmentPlanItemService.getPlanItems(planId);
  return items.filter(countsTowardsPlanTotal).map((item) => ({
    serviceId: item.serviceId,
    description: item.serviceName.slice(0, 200),
    toothRef: planTeeth(item.toothNumbers),
    quantity: item.quantity,
    unitPrice: item.unitCost,
  }));
}

/** `"[16,17]"` → `"16, 17"` (máx. 20 caracteres, el límite de la pieza). */
function planTeeth(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const teeth = JSON.parse(raw) as unknown;
    if (!Array.isArray(teeth) || teeth.length === 0) return undefined;
    const text = teeth.join(", ");
    return text.length <= 20 ? text : text.slice(0, 20);
  } catch {
    return undefined;
  }
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

/** Datos de la clínica para el encabezado del recibo imprimible. */
export function useClinicReceiptHeader() {
  return useQuery({
    queryKey: ["billing-catalog", "clinic-header"],
    queryFn: async () => {
      const settings = await clinicGeneralSettingsService.getGeneralSettings();
      return {
        name: settings.name,
        address: settings.address ?? null,
        phone: settings.phone ?? null,
        logoUrl: settings.logoUrl ?? null,
      };
    },
    staleTime: 10 * 60_000,
  });
}
