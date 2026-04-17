"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { loadLoggedUser } from "@/lib/auth/token-storage";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import {
  permissionsToObject,
  hasAction,
  type PermissionsObject,
} from "@/lib/permissions/permissions-encoding";

type PermissionModule = string;

function extractPermissionsFromJwtPayload(
  payload: Record<string, unknown>
): string[] | null {
  const candidates = [
    payload.permissions,
    (payload as unknown).Permissions,
    (payload as unknown).permisos,
    (payload as unknown).permission,
  ];

  for (const c of candidates) {
    if (Array.isArray(c) && c.every((x) => typeof x === "string")) {
      return c as string[];
    }
  }

  return null;
}

export function usePermission() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    // Admin shortcut: allow all
    const role = (user?.roleName ?? "").toLowerCase();
    if (role === "admin") return { isAdmin: true, permissions: [] as string[] };

    // Prefer context-provided permissions if present
    const direct = (user as unknown)?.permissions;
    if (
      Array.isArray(direct) &&
      direct.every((x: unknown) => typeof x === "string")
    ) {
      return { isAdmin: false, permissions: direct as string[] };
    }

    // Fallback to loggedUser payload (JWT)
    const logged = loadLoggedUser();
    const payload = (logged?.userInfo ?? {}) as Record<string, unknown>;
    const extracted = extractPermissionsFromJwtPayload(payload);

    return { isAdmin: false, permissions: extracted ?? [] };
  }, [user]);

  const permissionsObj: PermissionsObject = useMemo(
    () => permissionsToObject(permissions.permissions),
    [permissions.permissions]
  );

  const can = useMemo(() => {
    return (moduleKey: PermissionModule, action: PermissionAction) => {
      if (permissions.isAdmin) return true;
      return hasAction(permissionsObj, moduleKey, action);
    };
  }, [permissions.isAdmin, permissionsObj]);

  return {
    can,
    permissionsObj,
    isAdmin: permissions.isAdmin,
  };
}
