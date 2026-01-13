import { PermissionAction } from "./permission-actions";

export type PermissionsObject = Record<string, number>;

export function permissionsToObject(permissions: string[]): PermissionsObject {
  const obj: PermissionsObject = {};

  for (const permission of permissions) {
    if (typeof permission !== "string") continue;
    const idx = permission.lastIndexOf("-");
    if (idx <= 0) continue;

    const moduleKey = permission.slice(0, idx).trim();
    const rawValue = permission.slice(idx + 1).trim();
    const value = Number.parseInt(rawValue, 10);

    if (!moduleKey) continue;
    if (!Number.isFinite(value) || Number.isNaN(value)) continue;

    obj[moduleKey] = value;
  }

  return obj;
}

export function objectToPermissions(obj: PermissionsObject): string[] {
  return Object.entries(obj)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([moduleKey, value]) => `${moduleKey}-${value}`);
}

export function hasAction(
  obj: PermissionsObject,
  moduleKey: string,
  action: PermissionAction
): boolean {
  const value = obj[moduleKey] || 0;
  return (value & action) === action;
}

export function getModuleActions(
  obj: PermissionsObject,
  moduleKey: string
): PermissionAction[] {
  const value = obj[moduleKey] || 0;
  const actions: PermissionAction[] = [];

  if ((value & PermissionAction.CREATE) === PermissionAction.CREATE)
    actions.push(PermissionAction.CREATE);
  if ((value & PermissionAction.EDIT) === PermissionAction.EDIT)
    actions.push(PermissionAction.EDIT);
  if ((value & PermissionAction.DELETE) === PermissionAction.DELETE)
    actions.push(PermissionAction.DELETE);
  if ((value & PermissionAction.BLOCK) === PermissionAction.BLOCK)
    actions.push(PermissionAction.BLOCK);

  return actions;
}
