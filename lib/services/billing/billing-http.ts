import type { AxiosRequestConfig, Method } from "axios";
import type { ZodTypeAny } from "zod";
import apiInstance from "@/lib/services/apiConfig";
import { emitFinanceModuleDisabled, toBillingError } from "./billing-errors";

/**
 * Cliente HTTP del módulo de Finanzas.
 *
 * - Lanza siempre `BillingApiError` (nunca devuelve la respuesta de error cruda).
 * - Maneja sus propios 403 (`skipForbiddenHandler`): el de "módulo apagado" notifica a la app
 *   para invalidar capabilities; el de permiso lo muestra la pantalla.
 * - En desarrollo valida la respuesta contra el schema del contrato y avisa en consola si diverge.
 */

export interface BillingRequestOptions {
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Sin barra de carga global (refrescos periódicos). */
  silent?: boolean;
  /** Estados que la pantalla espera (p. ej. 404 = "no hay caja"): no se loguean como error. */
  expectedStatuses?: number[];
  /** Schema del contrato: solo se usa en desarrollo para detectar desvíos. */
  schema?: ZodTypeAny;
}

export interface BillingHttpResponse<T> {
  data: T;
  status: number;
}

function cleanParams(params: BillingRequestOptions["params"]): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function checkContract(url: string, schema: ZodTypeAny | undefined, data: unknown): void {
  if (!schema || process.env.NODE_ENV === "production") return;
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[billing] La respuesta de ${url} no cumple el contrato:`, result.error.issues);
  }
}

export async function billingRequest<T>(
  method: Method,
  url: string,
  options: BillingRequestOptions = {},
): Promise<BillingHttpResponse<T>> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.silent) headers["X-Silent"] = "true";

  const config: AxiosRequestConfig & {
    skipForbiddenHandler: boolean;
    expectedStatuses?: number[];
  } = {
    method,
    url,
    data: options.data,
    params: cleanParams(options.params),
    headers,
    skipForbiddenHandler: true,
    expectedStatuses: [403, ...(options.expectedStatuses ?? [])],
  };

  try {
    const response = await apiInstance.request<T>(config);
    checkContract(url, options.schema, response.data);
    return { data: response.data, status: response.status };
  } catch (err) {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    const error = toBillingError(response?.status, response?.data);
    if (error.kind === "module-disabled") emitFinanceModuleDisabled();
    throw error;
  }
}

export const MAX_PAGE_SIZE = 100;

/** Paginación base 0 con pageSize acotado a lo que acepta el backend. */
export function pageParams(page?: number, pageSize?: number) {
  return {
    page: page ?? 0,
    pageSize: Math.min(Math.max(pageSize ?? 10, 1), MAX_PAGE_SIZE),
  };
}
