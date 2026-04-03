"use client";

import { Tag, Space, Typography } from "antd";
import {
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ClinicalHistoryPatientHeader } from "@/lib/entity/clinical-history";
import { ALERT_SEVERITY_COLORS } from "@/lib/entity/clinical-history";
import dayjs from "dayjs";

const { Text, Title } = Typography;

interface ClinicalHistoryHeaderProps {
  patientHeader: ClinicalHistoryPatientHeader;
}

export function ClinicalHistoryHeader({
  patientHeader,
}: ClinicalHistoryHeaderProps) {
  const {
    name,
    age,
    gender,
    phone,
    email,
    bloodType,
    insurancePlan,
    emergencyContact,
    alerts,
    lastVisit,
    nextAppointment,
  } = patientHeader;

  const formatDate = (value: string) =>
    dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : value;

  return (
    <div
      style={{
        padding: "16px 24px",
        background: "#fafafa",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {name}
          </Title>
          <Space size="middle" style={{ marginTop: 4 }}>
            <Text type="secondary">
              {age} años · {gender}
            </Text>
            {bloodType && (
              <Tag color="red" style={{ marginInlineEnd: 0 }}>
                {bloodType}
              </Tag>
            )}
          </Space>
        </div>

        <Space size="large" wrap>
          {phone && (
            <Space size={4}>
              <PhoneOutlined />
              <Text type="secondary">{phone}</Text>
            </Space>
          )}
          {email && (
            <Space size={4}>
              <MailOutlined />
              <Text type="secondary">{email}</Text>
            </Space>
          )}
          {insurancePlan && (
            <Space size={4}>
              <SafetyOutlined />
              <Text type="secondary">{insurancePlan}</Text>
            </Space>
          )}
          {emergencyContact && (
            <Space size={4}>
              <TeamOutlined />
              <Text type="secondary">Emergencia: {emergencyContact}</Text>
            </Space>
          )}
          {lastVisit && (
            <Space size={4}>
              <CalendarOutlined />
              <Text type="secondary">
                Última visita: {formatDate(lastVisit)}
              </Text>
            </Space>
          )}
          {nextAppointment && (
            <Space size={4}>
              <CalendarOutlined style={{ color: "#1677ff" }} />
              <Text>Próxima cita: {formatDate(nextAppointment)}</Text>
            </Space>
          )}
        </Space>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Space size={[4, 4]} wrap>
            {alerts.map((alert) => (
              <Tag key={alert.id} color={ALERT_SEVERITY_COLORS[alert.severity]}>
                {alert.message}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
}
