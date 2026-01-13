"use client";

import { ReactNode, useMemo } from "react";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

export interface PermissionGateProps {
  moduleKey: string;
  action: PermissionAction | PermissionAction[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function PermissionGate({
  moduleKey,
  action,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { can, isAdmin } = usePermission();

  const allowed = useMemo(() => {
    if (isAdmin) return true;

    const actions = Array.isArray(action) ? action : [action];
    if (actions.length === 0) return false;

    return requireAll
      ? actions.every((a) => can(moduleKey, a))
      : actions.some((a) => can(moduleKey, a));
  }, [isAdmin, action, requireAll, can, moduleKey]);

  return <>{allowed ? children : fallback}</>;
}
