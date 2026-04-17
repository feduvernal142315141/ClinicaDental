"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { DoctorForm } from "@/components/doctors";
import { SectionTitle } from "@/components/ui/antd";
import { useAuth } from "@/lib/contexts/auth-context";
import { loadLoggedUser } from "@/lib/auth/token-storage";

function getLoggedUserDoctorId(fallbackId?: string | null): string | null {
  if (fallbackId) return fallbackId;

  const logged = loadLoggedUser();
  const userInfo = logged?.userInfo as Record<string, unknown> | undefined;

  const idFromJwt = userInfo?.userId;
  const idFromUpper = (userInfo as unknown)?.Id;
  const idFromLower = (userInfo as unknown)?.id;

  const resolved = idFromJwt ?? idFromUpper ?? idFromLower;
  return resolved ? String(resolved) : null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();

  const doctorId = useMemo(() => {
    return getLoggedUserDoctorId(user?.id ?? null);
  }, [user?.id]);

  if (!doctorId) {
    return (
      <SectionTitle
        title="Mi Perfil"
        subtitle="No se pudo identificar el usuario autenticado"
        actionButton={{
          label: "Volver",
          onClick: () => router.push("/settings"),
          variant: "back",
          type: "default",
        }}
      />
    );
  }

  return (
    <>
      <SectionTitle
        title="Mi Perfil"
        subtitle="Actualiza tu información de usuario"
        actionButton={{
          label: "Atrás",
          onClick: () => router.push("/settings"),
          variant: "back",
          type: "default",
        }}
      />
      <DoctorForm
        doctorId={doctorId}
        basePath="/settings/profile"
        showRoleStatusFields={false}
      />
    </>
  );
}
