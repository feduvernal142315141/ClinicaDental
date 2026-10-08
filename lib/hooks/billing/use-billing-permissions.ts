"use client";

import { useMemo } from "react";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import type { PermissionsObject } from "@/lib/permissions/permissions-encoding";

/** Módulos de permisos de Finanzas (claim JWT `"{modulo}-{bitmask}"`). */
export const BILLING_PERMISSION_MODULES = {
  BILLING: "billing",
  ADJUST: "billing_adjust",
  CASH: "billing_cash",
  REPORTS: "billing_reports",
} as const;

export interface BillingPermissions {
  /** Lecturas de Finanzas (cualquier bit de `billing`). */
  canView: boolean;
  /** Cobrar, emitir recibo, convertir, crear cargo y presupuesto. */
  canCreate: boolean;
  /** Editar presupuesto/recibo, cambiar estado, descartar cargo, registrar tipo de cambio. */
  canEdit: boolean;
  /** Anular recibo y anular pago. */
  canVoid: boolean;
  /** Aplicar descuentos (`billing_adjust` CREATE). */
  canDiscount: boolean;
  /** Devolver dinero (`billing_adjust` DELETE). */
  canRefund: boolean;
  /** Historial de cajas (cualquier bit de `billing_cash`). */
  canViewCashHistory: boolean;
  canOpenCash: boolean;
  canCloseCash: boolean;
  /** Caja del día, por cobrar y dashboard (cualquier bit de `billing_reports`). */
  canViewReports: boolean;
  /** La configuración de Finanzas es solo para el Administrador. */
  isAdmin: boolean;
}

/** Lógica pura (testeable) a partir del objeto de permisos decodificado del JWT. */
export function resolveBillingPermissions(
  permissions: PermissionsObject,
  isAdmin: boolean,
): BillingPermissions {
  const bits = (module: string) => (isAdmin ? PermissionAction.ALL : permissions[module] ?? 0);
  const has = (module: string, action: PermissionAction) => (bits(module) & action) === action;
  const any = (module: string) => bits(module) > 0;
  const { BILLING, ADJUST, CASH, REPORTS } = BILLING_PERMISSION_MODULES;

  return {
    canView: any(BILLING),
    canCreate: has(BILLING, PermissionAction.CREATE),
    canEdit: has(BILLING, PermissionAction.EDIT),
    canVoid: has(BILLING, PermissionAction.BLOCK),
    canDiscount: has(ADJUST, PermissionAction.CREATE),
    canRefund: has(ADJUST, PermissionAction.DELETE),
    canViewCashHistory: any(CASH),
    canOpenCash: has(CASH, PermissionAction.CREATE),
    canCloseCash: has(CASH, PermissionAction.EDIT),
    canViewReports: any(REPORTS),
    isAdmin,
  };
}

export function useBillingPermissions(): BillingPermissions {
  const { permissionsObj, isAdmin } = usePermission();
  return useMemo(() => resolveBillingPermissions(permissionsObj, isAdmin), [permissionsObj, isAdmin]);
}
