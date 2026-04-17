"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import { Label } from "@/components/ui/atomic/forms/label";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Shield, Settings } from "lucide-react";
import type { Role, Permission } from "@/lib/doctors";

export default function RoleCard({
  role,
  permissions,
  onUpdateRole,
}: {
  role: Role;
  permissions: Permission[];
  onUpdateRole: (roleId: string, permissionIds: string[]) => void;
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role.permissions.map((p) => p.id)
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateRole(role.id, selectedPermissions);
    setIsEditing(false);
  };

  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) acc[permission.category] = [];
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<string, string> = {
    appointments: "Citas",
    patients: "Pacientes",
    doctors: "Doctores",
    settings: "Configuración",
    reports: "Reportes",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{role.name}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditing ? "Cancelar" : "Configurar"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {Object.entries(permissionsByCategory).map(
              ([category, categoryPermissions]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {categoryLabels[category] || category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPermissions((prev) =>
                              checked
                                ? [...prev, permission.id]
                                : prev.filter((id) => id !== permission.id)
                            );
                          }}
                        />
                        <Label htmlFor={permission.id} className="text-sm">
                          {permission.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave}>Guardar Cambios</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(permissionsByCategory).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ([category, categoryPermissions]) => {
                const rolePermissions = role.permissions.filter(
                  (p) => p.category === category
                );
                if (rolePermissions.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2">
                      {categoryLabels[category] || category}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissions.map((permission) => (
                        <Badge
                          key={permission.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {permission.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
