"use client";

import {
  Card,
  Collapse,
  Tag,
  Typography,
  Row,
  Col,
  Button,
  Empty,
  Descriptions,
} from "antd";
import {
  EditOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ClinicalHistoryMedicalHistory } from "@/lib/entity/clinical-history";
import dayjs from "dayjs";

const { Text } = Typography;

interface MedicalHistorySectionProps {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  canEdit: boolean;
  onEdit: () => void;
  canValidate: boolean;
  onValidate: () => void;
  validating?: boolean;
}

function TagList({ items, color }: { items: string[]; color?: string }) {
  if (items.length === 0) {
    return <Text type="secondary">Ninguno registrado</Text>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((item) => (
        <Tag key={item} color={color}>
          {item}
        </Tag>
      ))}
    </div>
  );
}

export function MedicalHistorySection({
  medicalHistory,
  canEdit,
  onEdit,
  canValidate,
  onValidate,
  validating,
}: MedicalHistorySectionProps) {
  if (!medicalHistory) {
    return (
      <Card>
        <Empty description="No se ha registrado historia médica">
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onEdit}>
              Crear historia médica
            </Button>
          )}
        </Empty>
      </Card>
    );
  }

  const {
    occupation,
    maritalStatus,
    systemicDiseases,
    currentMedications,
    allergies,
    previousSurgeries,
    habits,
    lastDentalVisit,
    isValidated,
    validatedAt,
    validatedBy,
  } = medicalHistory;

  const collapseItems = [
    {
      key: "diseases",
      label: `Enfermedades sistémicas (${systemicDiseases.length})`,
      children: <TagList items={systemicDiseases} color="red" />,
    },
    {
      key: "medications",
      label: `Medicamentos actuales (${currentMedications.length})`,
      children: <TagList items={currentMedications} color="blue" />,
    },
    {
      key: "allergies",
      label: `Alergias (${allergies.length})`,
      children: <TagList items={allergies} color="orange" />,
    },
    {
      key: "surgeries",
      label: `Cirugías previas (${previousSurgeries.length})`,
      children: <TagList items={previousSurgeries} color="purple" />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Validation badge + Edit button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {isValidated ? (
            <Tag icon={<SafetyCertificateOutlined />} color="success">
              Validada{validatedBy ? ` por ${validatedBy}` : ""}
              {validatedAt
                ? ` · ${dayjs(validatedAt).format("DD/MM/YYYY")}`
                : ""}
            </Tag>
          ) : (
            <Tag color="warning">Pendiente de validación</Tag>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isValidated && canValidate && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={onValidate}
              loading={validating}
            >
              Validar historia médica
            </Button>
          )}
          {canEdit && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Editar
            </Button>
          )}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left column: personal/contact data */}
        <Col xs={24} md={12}>
          <Card size="small" title="Datos clínicos" style={{ height: "100%" }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Ocupación">
                {occupation ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Estado civil">
                {maritalStatus ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Última visita dental">
                {lastDentalVisit
                  ? dayjs(lastDentalVisit).format("DD/MM/YYYY")
                  : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right column: dental info */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            title="Antecedentes odontológicos"
            style={{ height: "100%" }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Hábitos">
                {habits.length > 0 ? (
                  <TagList items={habits} color="cyan" />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
            {/* Motivo de consulta y dolor actual son per-visita: se ven en el
                workspace de la consulta y en el historial de visitas. */}
          </Card>
        </Col>
      </Row>

      {/* Medical antecedents */}
      <Card size="small" title="Antecedentes médicos">
        <Collapse items={collapseItems} defaultActiveKey={[]} />
      </Card>
    </div>
  );
}
