import type { AxiosRequestConfig, Method } from "axios";
import apiInstance from "@/lib/services/apiConfig";
import { emitLeadModuleDisabled, toLeadError } from "./leads-errors";

/**
 * Cliente HTTP de "Adquisición de pacientes".
 *
 * - Lanza siempre `LeadApiError` (nunca devuelve la respuesta de error cruda).
 * - Maneja sus propios 403 (`skipForbiddenHandler`): el de módulo apagado avisa a la app para
 *   refrescar capacidades; el de permiso lo muestra la pantalla.
 * - Nunca envía `clinicId`: la clínica sale de la sesión.
 */

export type LeadParams = Record<string, string | number | boolean | undefined | null>;

export interface LeadRequestOptions {
  data?: unknown;
  params?: LeadParams;
  /** Sin barra de carga global (lecturas de fondo: contador del menú, panel de la bandeja). */
  silent?: boolean;
  /** Estados que la pantalla espera y resuelve: no se loguean como error. */
  expectedStatuses?: number[];
}

function cleanParams(params: LeadParams | undefined): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    // Un booleano en `false` equivale a no filtrar: no se envía.
    if (value === undefined || value === null || value === "" || value === false) continue;
    out[key] = value;
  }
  return out;
}

export async function leadRequest<T>(method: Method, url: string, options: LeadRequestOptions = {}): Promise<T> {
  const config: AxiosRequestConfig & { skipForbiddenHandler: boolean; expectedStatuses: number[] } = {
    method,
    url,
    data: options.data,
    params: cleanParams(options.params),
    headers: options.silent ? { "X-Silent": "true" } : undefined,
    skipForbiddenHandler: true,
    expectedStatuses: [403, 409, ...(options.expectedStatuses ?? [])],
  };

  try {
    const response = await apiInstance.request<T>(config);
    return response.data;
  } catch (err) {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    const error = toLeadError(response?.status, response?.data);
    if (error.kind === "module-disabled") emitLeadModuleDisabled();
    throw error;
  }
}

export const LEAD_MAX_PAGE_SIZE = 100;

/** Paginación base 0 con `pageSize` acotado a lo que acepta el backend (1 a 100). */
export function leadPageParams(page?: number, pageSize?: number) {
  return {
    page: Math.max(page ?? 0, 0),
    pageSize: Math.min(Math.max(pageSize ?? 10, 1), LEAD_MAX_PAGE_SIZE),
  };
}
