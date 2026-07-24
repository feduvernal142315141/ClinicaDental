/**
 * UserType Entity Types
 *
 * Catálogo GESTIONABLE (per-clínica) de tipos de usuario (profesión/cargo:
 * Dentista, Higienista, Recepcionista, ...). Reemplaza el enum hardcodeado
 * `UserType` del backend y la lista estática `USER_TYPE_CODES` del front
 * (ver `lib/entity/doctors`, marcada @deprecated).
 *
 * El booleano `attendsAppointments` ("atiende citas") es la ÚNICA fuente de
 * verdad para saber si un tipo es "clínico"/agendable como proveedor — el
 * front NUNCA vuelve a hardcodear esa lista; se deriva de este campo.
 */

export interface UserType {
  id: string;
  name: string;
  description?: string;
  /** "Atiende citas": si es agendable como proveedor de cita. */
  attendsAppointments: boolean;
  clinicId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  isArchived: boolean;
}

/**
 * Forma reducida tal como viaja embebida en Doctor (`GET /doctor` /
 * `GET /doctor/{id}`): `{ id, name, attendsAppointments }`, resuelta por el
 * backend a partir del catálogo de la clínica. `null` si el `userTypeId` del
 * doctor no matchea ningún tipo del catálogo.
 */
export interface UserTypeRef {
  id: string;
  name: string;
  attendsAppointments: boolean;
}

export interface CreateUserTypeDto {
  name: string;
  description?: string;
  attendsAppointments: boolean;
}

export interface UpdateUserTypeDto {
  name: string;
  description?: string;
  attendsAppointments: boolean;
}

/**
 * Backend pagination structure (envelope cuando pageSize > 0).
 * Espejo de `LabelsPagination` / `Pagination` (doctors).
 */
export interface UserTypesPagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Envelope paginado de /user-types cuando pageSize > 0.
 * Con pageSize = 0 (u omitido) el backend mantiene el comportamiento legacy
 * de lista completa (`UserType[]`) — ver `userTypesService.getUserTypes`.
 */
export interface PaginatedUserTypesResponse {
  entities: UserType[];
  pagination: UserTypesPagination;
}

/**
 * Parámetros para `userTypesService.getUserTypesPage` (GET /user-types con
 * filtros estructurados campo__OPERADOR__valor, orden y paginación server-side).
 */
export interface GetUserTypesPageParams {
  /** Texto libre; se mapea a filters=name__CONTAINS_IGNORE_CASE__<query> */
  query?: string;
  /** Igual semántica que `getUserTypes(includeArchived)` (compat) */
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * `true` si el tipo de usuario es agendable como proveedor de cita. Sustituye
 * a `isClinicalUserType` (lista hardcodeada) — la clinicalidad se lee del
 * dato del catálogo, no de un código fijo.
 */
export function isProviderUserType(userType?: Pick<UserType, "attendsAppointments"> | null): boolean {
  return !!userType?.attendsAppointments;
}

/**
 * Deriva el conjunto de `id`s del catálogo con `attendsAppointments=true` y no
 * archivados — reemplazo directo de la lista estática `CLINICAL_USER_TYPES`.
 * Úsese para poblar filtros/validaciones que antes comparaban contra códigos
 * fijos (ej. especialidad condicional en `doctor-form.schema`).
 */
export function deriveProviderUserTypeIds(userTypes: UserType[]): Set<string> {
  return new Set(
    userTypes.filter((t) => t.attendsAppointments && !t.isArchived).map((t) => t.id),
  );
}
