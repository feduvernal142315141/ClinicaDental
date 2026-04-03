"use client";

import { Card, Statistic, Tag, Typography, Row, Col, Empty } from "antd";
import {
  MedicineBoxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { ClinicalHistorySummary } from "@/lib/entity/clinical-history";
import dayjs from "dayjs";

const { Text } = Typography;

const formatDate = (value: string) =>
  dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : value;

interface SummarySectionProps {
  summary: ClinicalHistorySummary;
}

export function SummarySection({ summary }: SummarySectionProps) {
  const {
    activeTreatments,
    pendingTreatments,
    completedTreatments,
    criticalTeeth,
    lastVisit,
    nextAppointment,
    mainDiagnoses,
  } = summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Tratamientos activos"
              value={activeTreatments}
              prefix={<MedicineBoxOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pendientes"
              value={pendingTreatments}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Completados"
              value={completedTreatments}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Dientes críticos"
              value={criticalTeeth.length}
              prefix={<WarningOutlined style={{ color: "#ff4d4f" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title="Fechas importantes"
            style={{ height: "100%" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">
                  <CalendarOutlined /> Última visita
                </Text>
                <Text>
                  {lastVisit ? formatDate(lastVisit) : "Sin registro"}
                </Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">
                  <CalendarOutlined /> Próxima cita
                </Text>
                <Text>
                  {nextAppointment
                    ? formatDate(nextAppointment)
                    : "No programada"}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            size="small"
            title="Diagnósticos principales"
            style={{ height: "100%" }}
          >
            {mainDiagnoses.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Sin diagnósticos registrados"
              />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {mainDiagnoses.map((diagnosis) => (
                  <Tag key={diagnosis} color="blue">
                    {diagnosis}
                  </Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {criticalTeeth.length > 0 && (
        <Card size="small" title="Dientes críticos">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {criticalTeeth.map((tooth) => (
              <Tag key={tooth} color="red">
                {tooth}
              </Tag>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
