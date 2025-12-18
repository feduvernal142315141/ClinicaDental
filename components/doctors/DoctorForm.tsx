"use client";

import { Form, Divider, Input, Row, Col, Flex } from "antd";
import { useDoctorForm } from "@/hooks/use-doctor-form";

import { BasicInfoFields } from "./BasicInfoFields";
import { ProfessionalInfoFields } from "./ProfessionalInfoFields";
import {
  FormActions,
  RoleStatusFields,
  SecurityFields,
  AvatarUpload,
  DoctorScheduleFields,
} from ".";
import type { Doctor } from "@/lib/entity/doctors";
import { Card } from "../ui/antd/data-display/Card";
import { DEFAULT_WEEK_SCHEDULE } from "@/lib/entity/schedule";

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
  basePath = "/settings/doctors",
  initialData,
}: DoctorFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel, handleBack } =
    useDoctorForm({ doctorId, basePath, initialData });

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ active: true, schedule: DEFAULT_WEEK_SCHEDULE }}
      disabled={loading}
    >
      <Card
        styles={{
          body: {
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            overflowX: "hidden",
          },
        }}
        actions={[
          <Flex key="actions" justify="end" style={{ padding: "0 16px" }}>
            <FormActions loading={loading} onCancel={handleCancel} />
          </Flex>,
        ]}
      >
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={24} md={8} lg={8}>
            <Flex align="center" justify="center" className="w-full">
              <AvatarUpload
                size={280}
                maxCount={1}
                listType="picture-card"
                onFileListChange={(files) => {
                  const url = files[0]?.preview || files[0]?.url;
                  if (url) {
                    form.setFieldValue("avatarUrl", url);
                  }
                }}
              />
            </Flex>
          </Col>

          <Col xs={24} sm={24} md={16} lg={16}>
            <Flex justify={"space-between"} align={"start"} wrap={true}>
              <BasicInfoFields />

              <ProfessionalInfoFields />

              <Form.Item
                className="w-full "
                name="description"
                label="Descripción / Biografía"
              >
                <TextArea
                  className="pl-12"
                  rows={4}
                  placeholder="Información adicional sobre el doctor..."
                />
              </Form.Item>

              <SecurityFields isEditing={isEdit} />

              <RoleStatusFields />
            </Flex>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <DoctorScheduleFields />
        </Row>
      </Card>
    </Form>
  );
}
