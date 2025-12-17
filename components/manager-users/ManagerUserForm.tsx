"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, App, Divider, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageCard, LoadingSpinner } from "@/components/ui/antd";
import { useManagerUsers } from "@/lib/hooks/manager-users";
import {
  CreateManagerUserRequest,
  UpdateManagerUserRequest,
  ManagerUser,
} from "@/lib/entity/manager-users";

import { IdentificationFields } from "./IdentificationFields";
import { PersonalDataFields } from "./PersonalDataFields";
import { SecurityFields } from "./SecurityFields";
import { RoleStatusFields } from "./RoleStatusFields";
import { FormActions } from "./FormActions";

interface ManagerUserFormProps {
  /** User ID for editing (undefined for new user) */
  userId?: string;
  /** Base path for navigation */
  basePath?: string;
  /** Initial data (for editing) */
  initialData?: ManagerUser;
}

/**
 * Manager User Form Component
 *
 * Handles both creation and editing of manager users.
 * Uses Ant Design Form with validation.
 *
 * @example
 * // New user
 * <ManagerUserForm basePath="/settings/users" />
 *
 * // Edit user
 * <ManagerUserForm userId="123" basePath="/settings/users" initialData={user} />
 */
export function ManagerUserForm({
  userId,
  basePath = "/settings/users",
  initialData,
}: ManagerUserFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [password, setPassword] = useState("");

  const isEdit = !!userId;

  const { createUser, updateUser, loadUserById, isLoading } = useManagerUsers();

  // Load user data if editing
  useEffect(() => {
    if (isEdit && userId && !initialData) {
      loadUserById(userId).then((user) => {
        if (user) {
          form.setFieldsValue({
            identificationTypeId: user.identificationType?.id,
            identificationNumber: user.identificationNumber,
            names: user.names,
            surnames: user.surnames,
            email: user.email,
            cellphone: user.cellphone,
            roleId: user.role?.id,
            financialInstitutions: user.financialInstitutions,
            active: user.active,
          });
        }
      });
    } else if (initialData) {
      form.setFieldsValue({
        identificationTypeId: initialData.identificationType?.id,
        identificationNumber: initialData.identificationNumber,
        names: initialData.names,
        surnames: initialData.surnames,
        email: initialData.email,
        cellphone: initialData.cellphone,
        roleId: initialData.role?.id,
        financialInstitutions: initialData.financialInstitutions,
        active: initialData.active,
      });
    }
  }, [isEdit, userId, initialData, loadUserById, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        if (isEdit && userId) {
          const updateData: UpdateManagerUserRequest = {
            id: userId,
            identificationTypeId: values.identificationTypeId,
            identificationNumber: values.identificationNumber,
            names: values.names,
            surnames: values.surnames,
            email: values.email,
            cellphone: values.cellphone,
            password: values.password || undefined,
            roleId: values.roleId,
            financialInstitutions: values.financialInstitutions,
            active: values.active,
          };

          const success = await updateUser(updateData);
          if (success) {
            message.success("Usuario actualizado correctamente");
            router.push(basePath);
          }
        } else {
          const createData: CreateManagerUserRequest = {
            identificationTypeId: values.identificationTypeId,
            identificationNumber: values.identificationNumber,
            names: values.names,
            surnames: values.surnames,
            email: values.email,
            cellphone: values.cellphone,
            password: values.password,
            roleId: values.roleId,
            financialInstitutions: values.financialInstitutions,
            active: values.active ?? true,
          };

          const newUserId = await createUser(createData);
          if (newUserId) {
            message.success("Usuario creado correctamente");
            router.push(basePath);
          }
        }
      } catch (error) {
        message.error("Error al guardar usuario");
      }
    },
    [isEdit, userId, createUser, updateUser, message, router, basePath]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  // Handle back
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading && isEdit && !initialData) {
    return <LoadingSpinner tip="Cargando usuario..." fullPage />;
  }

  return (
    <PageCard
      title={isEdit ? "Editar Usuario" : "Nuevo Usuario"}
      subtitle={
        isEdit
          ? "Modifique los datos del usuario"
          : "Complete los datos del nuevo usuario"
      }
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Volver
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ active: true }}
        disabled={isLoading}
      >
        {/* Identification Section */}
        <IdentificationFields />

        {/* Personal Data Section */}
        <PersonalDataFields />

        {/* Role & Status Section */}
        <RoleStatusFields />
        
        {/* Security Section */}
        <SecurityFields
          isEdit={isEdit}
          password={password}
          onPasswordChange={setPassword}
        />

        {/* Action Buttons */}
        <FormActions
          isEdit={isEdit}
          isLoading={isLoading}
          onCancel={handleCancel}
        />
      </Form>
    </PageCard>
  );
}
