"use client";

import { Form, Modal } from "antd";
import { useDoctorChangePassword } from "@/lib/hooks/doctors";
import { SecurityFields } from "./SecurityFields";

interface ChangePasswordModalProps {
  open: boolean;
  doctorId: string;
  onClose: () => void;
}

export function ChangePasswordModal({
  open,
  doctorId,
  onClose,
}: ChangePasswordModalProps) {
  const [form] = Form.useForm();
  const { loading, changeDoctorPassword } = useDoctorChangePassword();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await changeDoctorPassword({
        doctorId,
        oldPassword: values.oldPassword,
        newPassword: values.password,
      });
      onClose();
    } catch {
      // If validation fails, AntD will show field errors.
      // If request fails, the hook shows a toast.
    }
  };

  return (
    <Modal
      title="Cambiar contraseña"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      okText="Cambiar"
      cancelText="Cancelar"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <SecurityFields mode="changePassword" />
      </Form>
    </Modal>
  );
}
