import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRoles } from "@/lib/hooks/roles/useRoles";
import { isSystemRole } from "@/lib/utils/roles.utils";
import {
  roleFormSchema,
  type RoleFormValues,
} from "@/lib/hooks/roles/role-form.schema";
import type { Role } from "@/lib/entity/roles";
import { notify } from "@/lib/utils/notify";

export type { RoleFormValues } from "@/lib/hooks/roles/role-form.schema";

interface UseRoleFormParams {
  roleId?: string;
  basePath?: string;
}

export function useRoleForm({
  roleId,
  basePath = "/settings/roles",
}: UseRoleFormParams) {
  const router = useRouter();

  const isEdit = useMemo(() => !!roleId, [roleId]);
  const isSystem = useMemo(
    () => (roleId ? isSystemRole(roleId) : false),
    [roleId],
  );

  const { loading, getRoleById, createRole, updateRole } = useRoles();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    mode: "onBlur",
    defaultValues: { roleName: "", permissions: [] },
  });
  const { reset } = form;

  // Mantener el estado consistente al alternar entre crear/editar o cambiar de
  // roleId (evita que nombre/permisos de un rol previo se filtren a la siguiente
  // pantalla). El payload y el prefill se conservan idénticos a HEAD.
  useEffect(() => {
    reset({ roleName: "", permissions: [] });

    if (!isEdit || !roleId) return;

    getRoleById(roleId)
      .then((role: Role) => {
        reset({
          roleName: role?.name ?? "",
          permissions: Array.isArray(role?.permissions) ? role.permissions : [],
        });
      })
      .catch((err) => {
        notify.error(err?.message || "No se pudo cargar el rol", {
          description:
            "No pudimos obtener los datos de este rol. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
      });
  }, [isEdit, roleId, getRoleById, reset]);

  const handleSubmit = useCallback(
    async (values: RoleFormValues) => {
      const payload = {
        roleName: values.roleName,
        permissions: values.permissions ?? [],
      };

      try {
        if (isEdit && roleId) {
          await updateRole(roleId, payload);
        } else {
          await createRole(payload);
        }
        router.push(basePath);
        router.refresh();
      } catch {
        // El interceptor de Axios / useRoles ya muestra el toast de error.
      }
    },
    [isEdit, roleId, createRole, updateRole, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  const handleBack = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    form,
    isEdit,
    isSystem,
    loading,
    handleSubmit,
    handleCancel,
    handleBack,
  };
}
