"use client";

import {
  Card,
  Tag,
  Table,
  Button,
  Empty,
  Progress,
  Collapse,
  Typography,
} from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import type {
  ClinicalHistoryTreatment,
  ClinicalHistoryTreatmentPlan,
  TreatmentStatus,
} from "@/lib/entity/clinical-history";
import {
  TREATMENT_STATUS_LABELS,
  TREATMENT_STATUS_COLORS,
} from "@/lib/entity/clinical-history";
import dayjs from "dayjs";

const { Text } = Typography;

interface TreatmentsSectionProps {
  treatments: ClinicalHistoryTreatment[];
  treatmentPlans: ClinicalHistoryTreatmentPlan[];
  onNavigateToOdontogram: () => void;
}

const treatmentColumns = [
  {
    key: "teeth",
    title: "Dientes",
    dataIndex: "teeth",
    render: (teeth: string[]) => (teeth?.length > 0 ? teeth.join(", ") : "-"),
  },
  {
    key: "procedure",
    title: "Procedimiento",
    dataIndex: "procedure",
  },
  {
    key: "diagnosis",
    title: "Diagnóstico",
    dataIndex: "diagnosis",
    render: (value: string) => value ?? "-",
  },
  {
    key: "status",
    title: "Estado",
    dataIndex: "status",
    render: (status: TreatmentStatus) => (
      <Tag color={TREATMENT_STATUS_COLORS[status]}>
        {TREATMENT_STATUS_LABELS[status] ?? status}
      </Tag>
    ),
  },
  {
    key: "serviceName",
    title: "Servicio",
    dataIndex: "serviceName",
    render: (value: string) => value ?? "-",
  },
  {
    key: "cost",
    title: "Costo",
    dataIndex: "cost",
    align: "right" as const,
    render: (value: number) =>
      typeof value === "number" ? `$${value.toFixed(2)}` : "-",
  },
  {
    key: "date",
    title: "Fecha",
    dataIndex: "date",
    render: (value: string) =>
      value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "-",
  },
];

export function TreatmentsSection({
  treatments,
  treatmentPlans,
  onNavigateToOdontogram,
}: TreatmentsSectionProps) {
  const planItems = treatmentPlans.map((plan) => {
    const percent =
      plan.totalTreatments > 0
        ? Math.round((plan.completedTreatments / plan.totalTreatments) * 100)
        : 0;

    return {
      key: plan.id,
      label: (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div>
            <Text strong>{plan.name}</Text>
            {plan.description && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                — {plan.description}
              </Text>
            )}
          </div>
          <Tag color={TREATMENT_STATUS_COLORS[plan.status]}>
            {TREATMENT_STATUS_LABELS[plan.status]}
          </Tag>
        </div>
      ),
      children: (
        <div>
          <Progress
            percent={percent}
            format={() => `${plan.completedTreatments}/${plan.totalTreatments}`}
            style={{ marginBottom: 12 }}
          />
          <Table
            dataSource={plan.treatments}
            columns={treatmentColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      ),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* CTA to odontogram */}
      <div style={{ textAlign: "right" }}>
        <Button
          type="primary"
          icon={<ExperimentOutlined />}
          onClick={onNavigateToOdontogram}
        >
          Gestionar en Odontograma
        </Button>
      </div>

      {/* Treatments table */}
      <Card size="small" title="Tratamientos">
        {treatments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Sin tratamientos registrados"
          />
        ) : (
          <Table
            dataSource={treatments}
            columns={treatmentColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 700 }}
          />
        )}
      </Card>

      {/* Treatment plans */}
      <Card size="small" title="Planes de tratamiento">
        {treatmentPlans.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Sin planes de tratamiento registrados"
          />
        ) : (
          <Collapse items={planItems} />
        )}
      </Card>
    </div>
  );
}
