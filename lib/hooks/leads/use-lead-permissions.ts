"use client";

import { useMemo } from "react";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import type { PermissionsObject } from "@/lib/permissions/permissions-encoding";

/** Módulos de permisos del claim JWT `"{modulo}-{bitmask}"` (CREATE=1, EDIT=2, DELETE=4). */
export const LEAD_PERMISSION_MODULES = {
  LEADS: "leads",
  MANAGE: "leads_manage",
} as const;

export interface LeadPermissions {
  /** Ver el módulo: cualquier acción sobre `leads` (no existe permiso de solo lectura). */
  canView: boolean;
  /** Crear prospecto, añadir nota, programar seguimiento, convertir una conversación. */
  canCreate: boolean;
  /** Editar, cambiar etapa, consentimiento, completar o cancelar seguimiento, reservar cita. */
  canEdit: boolean;
  /** Archivar. */
  canArchive: boolean;
  /** Asignar, convertir sin cita, resolver coincidencia con paciente, cerrar, reabrir. */
  canManage: boolean;
}

/** Lógica pura (testeable) a partir del objeto de permisos decodificado del JWT. */
export function resolveLeadPermissions(permissions: PermissionsObject, isAdmin: boolean): LeadPermissions {
  const bits = (module: string) => (isAdmin ? PermissionAction.ALL : permissions[module] ?? 0);
  const has = (module: string, action: PermissionAction) => (bits(module) & action) === action;
  const { LEADS, MANAGE } = LEAD_PERMISSION_MODULES;

  return {
    canView: bits(LEADS) > 0,
    canCreate: has(LEADS, PermissionAction.CREATE),
    canEdit: has(LEADS, PermissionAction.EDIT),
    canArchive: has(LEADS, PermissionAction.DELETE),
    canManage: has(MANAGE, PermissionAction.EDIT),
  };
}

export function useLeadPermissions(): LeadPermissions {
  const { permissionsObj, isAdmin } = usePermission();
  return useMemo(() => resolveLeadPermissions(permissionsObj, isAdmin), [permissionsObj, isAdmin]);
}
