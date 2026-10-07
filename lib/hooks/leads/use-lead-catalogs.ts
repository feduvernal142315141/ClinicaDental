"use client";

import { useQuery } from "@tanstack/react-query";
import { appointmentsService } from "@/lib/services/appointments";
import { doctorsService } from "@/lib/services/doctors";
import { servicesService } from "@/lib/services/services";
import { servicesQuery } from "@/lib/query/domains/services";
import { leadCatalogKeys } from "./lead-query-keys";

/**
 * Catálogos que el módulo consume de otros (servicios, usuarios, agenda). Solo lectura:
 * Adquisición no modifica Servicios, Usuarios ni Agenda.
 */

export interface LeadOption {
  id: string;
  name: string;
}

/** Servicios activos, por nombre: "servicio de interés" y servicios de la primera cita. */
export function useLeadServiceOptions(enabled = true) {
  return useQuery({
    queryKey: leadCatalogKeys.services,
    queryFn: async (): Promise<LeadOption[]> => {
      const { filters, orders } = servicesQuery().active(true).order("name", "asc").build();
      const page = await servicesService.getServices({ filters, orders, pageSize: 100 });
      return (page.entities ?? []).map((service) => ({ id: service.id, name: service.name }));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Usuarios activos de la clínica: responsable del prospecto y del seguimiento. */
export function useLeadUserOptions(enabled = true) {
  return useQuery({
    queryKey: leadCatalogKeys.users,
    queryFn: async (): Promise<LeadOption[]> => {
      const page = await doctorsService.getDoctors({ page: 0, pageSize: 100 });
      return (page.entities ?? [])
        .filter((user) => user.active !== false)
        .map((user) => ({ id: user.id, name: user.name }));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Quienes atienden citas (lo resuelve el backend con `onlyProviders`), igual que la agenda. */
export function useLeadProviderOptions(enabled = true) {
  return useQuery({
    queryKey: leadCatalogKeys.providers,
    queryFn: async (): Promise<LeadOption[]> => {
      const page = await doctorsService.getDoctors({ page: 0, pageSize: 100, onlyProviders: true });
      return (page.entities ?? [])
        .filter((doctor) => doctor.active !== false)
        .map((doctor) => ({
          id: doctor.id,
          name: `${doctor.name}${doctor.specialty ? ` - ${doctor.specialty}` : ""}`,
        }));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Horario del doctor, para resaltar en el calendario los días que atiende. */
export function useLeadDoctorSchedule(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["lead-catalog", "doctor-schedule", doctorId] as const,
    queryFn: async () => {
      const doctor = await doctorsService.getDoctorById(doctorId as string);
      return doctor.schedule ?? null;
    },
    enabled: !!doctorId,
    staleTime: 5 * 60_000,
  });
}

/** Horas libres del doctor ese día (mismo endpoint de disponibilidad que usa la agenda). */
export function useLeadAvailability(doctorId: string | undefined, date: string | undefined, duration: number) {
  return useQuery({
    queryKey: leadCatalogKeys.availability(doctorId ?? "", date ?? "", duration),
    queryFn: () => appointmentsService.getDoctorAvailability(doctorId as string, date as string, 15, duration),
    enabled: !!doctorId && !!date,
    staleTime: 0,
    gcTime: 0,
  });
}

export function optionName(options: LeadOption[] | undefined, id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return options?.find((option) => option.id === id)?.name;
}
