"use client";

import { useState, useEffect } from "react";
import { Modal, Input, Select, Form } from "antd";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { doctorsService } from "@/lib/services/doctors/doctors.service";
import type { Doctor } from "@/lib/entity/doctors";

interface StartConsultationNowModalProps {
  open: boolean;
  patientId: string;
  onClose: () => void;
  onStarted: (appointmentId: string) => void;
}

export function StartConsultationNowModal({
  open,
  patientId,
  onClose,
  onStarted,
}: StartConsultationNowModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Load doctors when modal opens
  useEffect(() => {
    if (!open) return;
    setDoctorsLoading(true);
    doctorsService
      .getDoctors({ pageSize: 100 })
      .then((result) => {
        setDoctors(result?.entities ?? []);
      })
      .catch(() => {
        setDoctors([]);
      })
      .finally(() => setDoctorsLoading(false));
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const result = await appointmentsService.startNowAppointment({
        patientId,
        doctorId: values.doctorId,
        reason: values.reason || undefined,
      });
      form.resetFields();
      onStarted(result.appointmentId);
    } catch (err: unknown) {
      // Validation errors are handled by AntD Form; service errors are toasted by interceptor
      const e = err as { message?: string };
      if (e?.message) {
        // Re-throw so loading state resets but modal stays open
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Nueva Consulta Express"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Iniciar Consulta"
      cancelText="Cancelar"
      confirmLoading={loading}
      mask={{ closable: !loading }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="doctorId"
          label="Doctor"
          rules={[{ required: true, message: "Seleccione un doctor" }]}
        >
          <Select
            placeholder="Seleccione un doctor"
            loading={doctorsLoading}
            showSearch
            optionFilterProp="label"
            options={doctors.map((d) => ({
              value: d.id,
              label: d.specialty
                ? `${d.name} — ${d.specialty}`
                : d.name,
            }))}
          />
        </Form.Item>

        <Form.Item name="reason" label="Motivo de consulta (opcional)">
          <Input.TextArea
            rows={3}
            placeholder="Ej: Dolor en molar inferior derecho"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
