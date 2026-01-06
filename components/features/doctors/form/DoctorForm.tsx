"use client";

import { Form, Divider, Input, Row, Col, Flex, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useDoctorForm } from "@/hooks/use-doctor-form";

import { BasicInfoFields } from "./fields/BasicInfoFields";
import { ProfessionalInfoFields } from "./fields/ProfessionalInfoFields";
import { RoleStatusFields } from "./fields/RoleStatusFields";
import { DoctorScheduleFields } from "./fields/DoctorScheduleFields";
import { FormActions } from "./components/FormActions";
import { AvatarUpload } from "./components/AvatarUpload";
import type { Doctor } from "@/lib/entity/doctors";
import { Card } from "@/components/ui/antd";
import { DEFAULT_WEEK_SCHEDULE } from "@/lib/entity/schedule";

const { TextArea } = Input;

interface DoctorFormProps {
  /** Doctor ID for editing (undefined for new doctor) */
  doctorId?: string;
  /** Base path for navigation */
  basePath?: string;
  /** Initial data (for editing) */
  initialData?: Doctor;
  /** Read-only mode (for detail view) */
  readOnly?: boolean;
  /** Show role & status section (default: true). Useful to hide in "My Profile". */
  showRoleStatusFields?: boolean;
}

/**
 * Doctor Form Component
 *
 * Handles creation, editing, and viewing of doctors (system users).
 * Uses Ant Design Form with validation.
 *
 * @example
 * // New doctor
 * <DoctorForm basePath="/settings/doctors" />
 *
 * // Edit doctor
 * <DoctorForm doctorId="123" basePath="/settings/doctors" />
 *
 * // View doctor (read-only)
 * <DoctorForm doctorId="123" basePath="/settings/doctors" readOnly />
 */
export function DoctorForm({
  doctorId,
  basePath = "/settings/doctors",
  initialData,
  readOnly = false,
  showRoleStatusFields = true,
}: DoctorFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel, handleBack } =
    useDoctorForm({ doctorId, basePath, initialData });

  // Get avatar URL from form (for edit mode)
  const avatarUrl = Form.useWatch("avatarUrl", form);

  // Build initial file list for AvatarUpload
  const initialFileList =
    avatarUrl && isEdit
      ? [
          {
            uid: "-1",
            name: "avatar.jpg",
            status: "done" as const,
            url: avatarUrl,
          },
        ]
      : [];

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        active: true,
        // Always set default schedule, useEffect will override it when editing
        schedule: DEFAULT_WEEK_SCHEDULE,
      }}
      disabled={loading || readOnly}
    >
      <Card
        styles={{
          body: {
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            overflowX: "hidden",
          },
        }}
        actions={
          readOnly
            ? undefined
            : [
                <Flex key="actions" justify="end" style={{ padding: "0 16px" }}>
                  <FormActions loading={loading} onCancel={handleCancel} />
                </Flex>,
              ]
        }
      >
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={24} md={8} lg={8}>
            <Flex align="center" justify="center" className="w-full">
              {readOnly ? (
                <Avatar
                  size={280}
                  src={avatarUrl}
                  icon={!avatarUrl ? <UserOutlined /> : undefined}
                  style={{
                    backgroundColor: !avatarUrl ? "#f0f0f0" : undefined,
                    color: !avatarUrl ? "#8c8c8c" : undefined,
                  }}
                />
              ) : (
                <AvatarUpload
                  size={280}
                  maxCount={1}
                  listType="picture-circle"
                  initialFileList={initialFileList}
                  disabled={readOnly}
                  onFileListChange={(files) => {
                    const url = files[0]?.preview || files[0]?.url;
                    if (url) {
                      form.setFieldValue("avatarUrl", url);
                    } else {
                      form.setFieldValue("avatarUrl", undefined);
                    }
                  }}
                />
              )}
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

              {showRoleStatusFields ? <RoleStatusFields /> : null}
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
