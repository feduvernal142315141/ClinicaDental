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
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ active: true, schedule: DEFAULT_WEEK_SCHEDULE }}
        disabled={loading}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div className="flex justify-center items-start pt-6">
              <AvatarUpload
                maxCount={1}
                listType="picture-circle"
                onFileListChange={(files) => {
                  const url = files[0]?.preview || files[0]?.url;
                  if (url) {
                    form.setFieldValue("avatarUrl", url);
                  }
                }}
              />
            </div>
          </Col>
          <Col span={16}>
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
        {/* Action Buttons */}
        <Flex justify={"end"}>
          <FormActions loading={loading} onCancel={handleCancel} />
        </Flex>
      </Form>
    </Card>
  );
}
