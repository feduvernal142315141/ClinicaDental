"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, App, Divider, Button, Input } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageCard, LoadingSpinner } from "@/components/ui/antd";
import { useDoctors } from "@/lib/hooks/doctors";
import {
  CreateDoctorRequest,
  UpdateDoctorRequest,
  Doctor,
} from "@/lib/entity/doctors";

import { BasicInfoFields } from "./BasicInfoFields";
import { ProfessionalInfoFields } from "./ProfessionalInfoFields";
import { SecurityFields } from "./SecurityFields";
import { RoleStatusFields } from "./RoleStatusFields";
import { FormActions } from "./FormActions";

const { TextArea } = Input;

interface DoctorFormProps {
  /** Doctor ID for editing (undefined for new doctor) */
  doctorId?: string;
  /** Base path for navigation */
  basePath?: string;
  /** Initial data (for editing) */
  initialData?: Doctor;
}

/**
 * Doctor Form Component
 *
 * Handles both creation and editing of doctors (system users).
 * Uses Ant Design Form with validation.
 *
 * @example
 * // New doctor
 * <DoctorForm basePath="/settings/users" />
 *
 * // Edit doctor
 * <DoctorForm doctorId="123" basePath="/settings/users" initialData={doctor} />
 */
export function DoctorForm({
  doctorId,
  basePath = "/settings/users",
  initialData,
}: DoctorFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [password, setPassword] = useState("");

  const isEdit = !!doctorId;

  const { createDoctor, updateDoctor, loadDoctorById, isLoading } =
    useDoctors();

  // Load doctor data if editing
  useEffect(() => {
    if (isEdit && doctorId && !initialData) {
      loadDoctorById(doctorId).then((doctor) => {
        if (doctor) {
          form.setFieldsValue({
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
            licenceNumber: doctor.licenceNumber,
            specialty: doctor.specialty,
            gender: doctor.gender,
            description: doctor.description,
            roleId: doctor.roleId,
            active: doctor.active,
          });
        }
      });
    } else if (initialData) {
      form.setFieldsValue({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        licenceNumber: initialData.licenceNumber,
        specialty: initialData.specialty,
        gender: initialData.gender,
        description: initialData.description,
        roleId: initialData.roleId,
        active: initialData.active,
      });
    }
  }, [isEdit, doctorId, initialData, loadDoctorById, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        if (isEdit && doctorId) {
          const updateData: UpdateDoctorRequest = {
            id: doctorId,
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty,
            gender: values.gender,
            description: values.description,
            password: values.password || undefined,
            roleId: values.roleId,
            active: values.active,
          };

          const success = await updateDoctor(updateData);
          if (success) {
            message.success("Doctor actualizado correctamente");
            router.push(basePath);
          }
        } else {
          const createData: CreateDoctorRequest = {
            name: values.name,
            email: values.email,
            phone: values.phone,
            licenceNumber: values.licenceNumber,
            specialty: values.specialty,
            gender: values.gender,
            description: values.description,
            roleId: values.roleId,
            active: values.active ?? true,
          };

          const newDoctorId = await createDoctor(createData);
          if (newDoctorId) {
            message.success("Doctor creado correctamente");
            router.push(basePath);
          }
        }
      } catch (error) {
        message.error("Error al guardar doctor");
      }
    },
    [isEdit, doctorId, createDoctor, updateDoctor, message, router, basePath]
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
    return <LoadingSpinner tip="Cargando doctor..." fullPage />;
  }

  return (
    <PageCard
      title={isEdit ? "Editar Doctor" : "Nuevo Doctor"}
      subtitle={
        isEdit
          ? "Modifique los datos del doctor"
          : "Complete los datos del nuevo doctor"
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
        {/* Basic Information */}
        <Divider titlePlacement="start">Información Básica</Divider>
        <BasicInfoFields />

        {/* Professional Information */}
        <Divider titlePlacement="start">Información Profesional</Divider>
        <ProfessionalInfoFields />

        {/* Description */}
        <Divider titlePlacement="start">Descripción</Divider>
        <Form.Item name="description" label="Descripción / Biografía">
          <TextArea
            rows={4}
            placeholder="Información adicional sobre el doctor..."
          />
        </Form.Item>

        {/* Security Section */}
        <Divider titlePlacement="start">Seguridad</Divider>
        <SecurityFields
          isEdit={isEdit}
          password={password}
          onPasswordChange={setPassword}
        />

        {/* Role & Status Section */}
        <Divider titlePlacement="start">Rol y Estado</Divider>
        <RoleStatusFields />

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
