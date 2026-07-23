import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRoles } from "@/lib/hooks/roles/useRoles";
import {
  permissionsService,
  type PermissionCatalogItem,
} from "@/lib/services/permissions";
import { isSystemRole } from "@/lib/utils/roles.utils";
import {
  roleFormSchema,
  type RoleFormValues,
} from "@/lib/hooks/roles/role-form.schema";
import type { CreateRoleApiRequest, Role } from "@/lib/entity/roles";
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

  const {
    loading: roleLoading,
    getRoleById,
    createRole,
    updateRole,
  } = useRoles();
  const [permissionCatalog, setPermissionCatalog] = useState<
    PermissionCatalogItem[] | null
  >(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    mode: "onBlur",
    defaultValues: { roleName: "", permissions: [] },
  });
  const { reset } = form;

  useEffect(() => {
    let active = true;

    setPermissionsLoading(true);
    setPermissionCatalog(null);

    permissionsService
      .getPermissions()
      .then((catalog) => {
        if (active) setPermissionCatalog(catalog);
      })
      .catch((error: unknown) => {
        if (!active) return;
        notify.error(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los permisos",
          {
            description:
              "No pudimos preparar el catálogo de permisos. Recarga la página e inténtalo de nuevo.",
          },
        );
      })
      .finally(() => {
        if (active) setPermissionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
      if (!permissionCatalog) {
        notify.error("Los permisos aún no están disponibles", {
          description:
            "Recarga la página para volver a cargar el catálogo de permisos.",
        });
        return;
      }

      let permissions: CreateRoleApiRequest["permissions"];
      try {
        permissions = permissionsService.resolveRolePermissions(
          values.permissions ?? [],
          permissionCatalog,
        );
      } catch (error: unknown) {
        notify.error(
          error instanceof Error
            ? error.message
            : "No se pudieron preparar los permisos",
        );
        return;
      }

      const payload: CreateRoleApiRequest = {
        roleName: values.roleName,
        permissions,
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
    [
      isEdit,
      roleId,
      permissionCatalog,
      createRole,
      updateRole,
      router,
      basePath,
    ],
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
    loading: roleLoading || permissionsLoading,
    permissionsReady: permissionCatalog !== null,
    handleSubmit,
    handleCancel,
    handleBack,
  };
}
