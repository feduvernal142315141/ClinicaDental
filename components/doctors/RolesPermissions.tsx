"use client";

import { Shield } from "lucide-react";
import { type Role, type Permission } from "@/lib/doctors";
import RoleCard from "./DoctorRoleCard";

export default function RolesPermissions({
  roles,
  permissions,
  reload,
}: {
  roles: Role[];
  permissions: Permission[];
  reload: () => void;
}) {
  const handleUpdateRole = async (roleId: string, permissionIds: string[]) => {
    try {
      // TODO
      // await roleService.updateRole(roleId, { permissions: permissionIds });
      console.log("Actualizar role:", roleId, permissionIds);
      await reload();
    } catch (error) {
      console.error("Error actualizando rol:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Roles y Permisos
        </h3>
        <p className="text-sm text-muted-foreground">
          Configura los roles del sistema y sus permisos asociados
        </p>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            permissions={permissions}
            onUpdateRole={handleUpdateRole}
          />
        ))}
      </div>
    </div>
  );
}
