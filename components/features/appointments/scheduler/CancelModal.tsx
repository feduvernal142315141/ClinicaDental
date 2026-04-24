"use client";

import { useState } from "react";
import { Modal, Radio, Input, Typography, Space, Alert } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCancelAppointment } from "@/lib/hooks/appointments/use-cancel-appointment";
import type { CancellationReasonCode } from "@/lib/entity/appointment";

const { Text } = Typography;
const { TextArea } = Input;

interface CancelModalProps {
  appointment: {
    id: string;
    patientName?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    date?: string;
    time?: string;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCEL_REASONS: { label: string; value: CancellationReasonCode }[] = [
  { label: "Paciente canceló", value: "PATIENT_CANCELLED" },
  { label: "Urgencia / conflicto del doctor", value: "DOCTOR_CONFLICT" },
  { label: "Reprogramación solicitada", value: "RESCHEDULE_REQUEST" },
  { label: "No se presentó el paciente", value: "NO_SHOW" },
  { label: "Otro", value: "OTHER" },
];

function formatAppointmentTime(appt: CancelModalProps["appointment"]): string {
  if (appt.scheduledStartAt) {
    const d = dayjs(appt.scheduledStartAt);
    return d.format("HH:mm · ddd DD MMM YYYY");
  }
  if (appt.date && appt.time) {
    return `${appt.time} · ${dayjs(appt.date).format("ddd DD MMM YYYY")}`;
  }
  return "—";
}

export function CancelModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CancelModalProps) {
  const [reasonCode, setReasonCode] = useState<
    CancellationReasonCode | undefined
  >();
  const [freeText, setFreeText] = useState("");

  const { cancel, loading } = useCancelAppointment(appointment.id, {
    onSuccess: () => {
      setReasonCode(undefined);
      setFreeText("");
      onSuccess();
      onClose();
    },
  });

  const isInProgress = appointment.status === "in_progress";

  const handleOk = async () => {
    await cancel({
      reasonCode,
      reason: reasonCode === "OTHER" ? freeText || undefined : undefined,
    });
  };

  const handleCancel = () => {
    setReasonCode(undefined);
    setFreeText("");
    onClose();
  };

  return (
    <Modal
      title="Cancelar cita"
      open={isOpen}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="Sí, cancelar cita"
      cancelText="Volver"
      okButtonProps={{ danger: true, loading }}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          title="Esta acción no se puede deshacer."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
        />

        {isInProgress && (
          <Alert
            title="La cita está en curso"
            description="El doctor ya inició esta cita. ¿Desea cancelarla de todos modos?"
            type="error"
            showIcon
          />
        )}

        <div>
          <Text strong>Paciente: </Text>
          <Text>{appointment.patientName ?? "—"}</Text>
          <br />
          <Text strong>Cita: </Text>
          <Text>{formatAppointmentTime(appointment)}</Text>
        </div>

        <div>
          <Text strong>Motivo de cancelación</Text>
          <Text type="secondary"> (opcional)</Text>
          <Radio.Group
            value={reasonCode}
            onChange={(e) =>
              setReasonCode(e.target.value as CancellationReasonCode)
            }
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 8,
            }}
          >
            {CANCEL_REASONS.map((r) => (
              <Radio key={r.value} value={r.value}>
                {r.label}
              </Radio>
            ))}
          </Radio.Group>

          {reasonCode === "OTHER" && (
            <TextArea
              style={{ marginTop: 8 }}
              rows={2}
              placeholder="Describe el motivo..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              maxLength={300}
              showCount
            />
          )}
        </div>
      </Space>
    </Modal>
  );
}
