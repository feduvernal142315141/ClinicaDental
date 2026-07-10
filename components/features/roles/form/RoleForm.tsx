"use client";

import { ShieldAlert } from "lucide-react";

import {
  Form,
  FormActionBar,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui/atomic/forms";
import { useRoleForm } from "@/lib/hooks/roles/use-role-form";
import { PermissionsSelector } from "./PermissionsSelector";

interface RoleFormProps {
  roleId?: string;
  basePath?: string;
}

const Req = () => <span className="text-rose-500">*</span>;

export function RoleForm({
  roleId,
  basePath = "/settings/roles",
}: RoleFormProps) {
  const { form, isEdit, isSystem, loading, handleSubmit, handleCancel } =
    useRoleForm({ roleId, basePath });

  const disabled = loading || isSystem;
  const { isDirty } = form.formState;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
        noValidate
      >
        {isEdit && isSystem && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <p className="font-medium text-ink">Este rol es del sistema</p>
              <p className="text-subtle">
                Sus permisos están protegidos y no pueden modificarse.
              </p>
            </div>
          </div>
        )}

        <section className="bento p-4 lg:p-5">
          <FormField
            control={form.control}
            name="roleName"
            render={({ field }) => (
              <FormItem className="max-w-md">
                <FormLabel>
                  Nombre del Rol <Req />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Recepcionista"
                    autoComplete="off"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink">Permisos</h2>
          <p className="text-sm text-subtle">
            Define qué puede hacer este rol en cada módulo del sistema.
          </p>
        </div>

        <FormField
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <PermissionsSelector
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
            />
          )}
        />

        <FormActionBar
          isDirty={isEdit ? isDirty : undefined}
          onSecondary={handleCancel}
          submitLabel={isEdit ? "Guardar cambios" : "Crear rol"}
          loading={loading}
          submitDisabled={disabled}
        />
      </form>
    </Form>
  );
}
