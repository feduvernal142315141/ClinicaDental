import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resolveBillingPermissions, useBillingPermissions } from "./use-billing-permissions";

const permissionState = vi.hoisted(() => ({
  permissionsObj: {} as Record<string, number>,
  isAdmin: false,
}));

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({
    can: () => false,
    permissionsObj: permissionState.permissionsObj,
    isAdmin: permissionState.isAdmin,
  }),
}));

describe("resolveBillingPermissions", () => {
  it("sin claims no permite nada", () => {
    const p = resolveBillingPermissions({}, false);
    expect(Object.entries(p).filter(([, v]) => v === true)).toEqual([]);
  });

  it("billing: leer con cualquier bit; CREATE cobra, EDIT edita, BLOCK anula", () => {
    expect(resolveBillingPermissions({ billing: 2 }, false)).toMatchObject({
      canView: true,
      canCreate: false,
      canEdit: true,
      canVoid: false,
    });
    expect(resolveBillingPermissions({ billing: 9 }, false)).toMatchObject({
      canView: true,
      canCreate: true,
      canEdit: false,
      canVoid: true,
    });
  });

  it("billing_adjust: CREATE = descuentos, DELETE = devoluciones", () => {
    expect(resolveBillingPermissions({ billing_adjust: 1 }, false)).toMatchObject({
      canDiscount: true,
      canRefund: false,
    });
    expect(resolveBillingPermissions({ billing_adjust: 4 }, false)).toMatchObject({
      canDiscount: false,
      canRefund: true,
    });
  });

  it("billing_cash: ver historial con cualquier bit, abrir con CREATE, cerrar con EDIT", () => {
    expect(resolveBillingPermissions({ billing_cash: 1 }, false)).toMatchObject({
      canViewCashHistory: true,
      canOpenCash: true,
      canCloseCash: false,
    });
    expect(resolveBillingPermissions({ billing_cash: 2 }, false)).toMatchObject({
      canOpenCash: false,
      canCloseCash: true,
    });
  });

  it("billing_reports: ver con cualquier bit", () => {
    expect(resolveBillingPermissions({ billing_reports: 1 }, false).canViewReports).toBe(true);
    expect(resolveBillingPermissions({ billing: 15 }, false).canViewReports).toBe(false);
  });

  it("el Administrador tiene todo", () => {
    const p = resolveBillingPermissions({}, true);
    expect(Object.values(p).every(Boolean)).toBe(true);
  });

  it("los permisos de otros módulos no cuentan", () => {
    expect(resolveBillingPermissions({ patients: 15, reports: 15 }, false).canView).toBe(false);
  });
});

describe("useBillingPermissions", () => {
  it("lee los claims del usuario autenticado", () => {
    permissionState.permissionsObj = { billing: 1, billing_cash: 3 };
    permissionState.isAdmin = false;
    const { result } = renderHook(() => useBillingPermissions());
    expect(result.current).toMatchObject({
      canView: true,
      canCreate: true,
      canEdit: false,
      canOpenCash: true,
      canCloseCash: true,
      canViewReports: false,
      isAdmin: false,
    });
  });
});
