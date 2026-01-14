import { useCallback, useEffect, useMemo } from "react";
import { App, Form } from "antd";
import { useRouter } from "next/navigation";
import { useRoles } from "@/lib/hooks/roles/useRoles";
import type { Role } from "@/lib/entity/roles";

interface UseRoleFormParams {
  roleId?: string;
  basePath?: string;
}

export function useRoleForm({
  roleId,
  basePath = "/settings/roles",
}: UseRoleFormParams) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const isEdit = useMemo(() => !!roleId, [roleId]);

  const { loading, getRoleById, createRole, updateRole } = useRoles();

  // Keep form state consistent when switching between create/edit or changing roleId.
  // This prevents stale permissions/name from a previous role from leaking into the next screen.
  useEffect(() => {
    // Reset first so UI doesn't briefly show previous values.
    form.resetFields();

    if (!isEdit || !roleId) return;

    getRoleById(roleId)
      .then((role: Role) => {
        form.setFieldsValue({
          roleName: role?.name,
          permissions: Array.isArray(role?.permissions) ? role.permissions : [],
        });
      })
      .catch((err) => {
        message.error(err?.message || "Error al cargar rol");
      });
  }, [isEdit, roleId, getRoleById, form, message]);

  const handleBack = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  const handleSubmit = useCallback(
    async (values: { roleName: string; permissions?: string[] }) => {
      const payload = {
        roleName: values.roleName,
        permissions: values.permissions ?? [],
      };

      if (isEdit && roleId) {
        await updateRole(roleId, payload);
      } else {
        await createRole(payload);
      }

      router.push(basePath);
      router.refresh();
    },
    [isEdit, roleId, createRole, updateRole, router, basePath]
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    form,
    isEdit,
    loading,
    handleSubmit,
    handleCancel,
    handleBack,
  };
}
