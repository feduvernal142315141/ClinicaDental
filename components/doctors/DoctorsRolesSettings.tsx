"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield } from "lucide-react";
import {
  doctorService,
  roleService,
  type Doctor,
  type Role,
  type Permission,
} from "@/lib/doctors";
import DoctorsList from "./DoctorsList";
import RolesPermissions from "./RolesPermissions";
import { useAuth } from "@/contexts/auth-context";
import { getDoctors } from "@/lib/supabase/doctors";

export default function DoctorsRolesSettings() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.clinicId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user?.clinicId]);

  const loadData = async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        roleService.getAllRoles(),
        roleService.getAllPermissions(),
      ]);
      const doctorsData = await getDoctors(user?.clinicId as string);
      setDoctors(doctorsData);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">Cargando...</div>
    );

  return (
    <Tabs defaultValue="doctors" className="space-y-4">
      <TabsList>
        <TabsTrigger value="doctors" className="flex items-center gap-2">
          <User className="h-4 w-4" /> Doctores
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="h-4 w-4" /> Roles y Permisos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="doctors">
        <DoctorsList doctors={doctors} reload={loadData} />
      </TabsContent>

      <TabsContent value="roles">
        <RolesPermissions
          roles={roles}
          permissions={permissions}
          reload={loadData}
        />
      </TabsContent>
    </Tabs>
  );
}
