"use client";

import { useEffect } from "react";
import {
  Alert,
  Button,
  Col,
  Divider,
  Flex,
  Form,
  InputNumber,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  FormInput,
  FormSelect,
  FormSwitch,
  FormTimePicker,
  PageCard,
  SectionTitle,
} from "@/components/ui/antd";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import type {
  ClinicScheduleDayKey,
  UpdateClinicGeneralSettingsRequest,
} from "@/lib/entity/settings";
import { CLINIC_SCHEDULE_DAYS } from "@/lib/entity/settings";

const { Text } = Typography;

const currencyOptions = [
  { value: "USD", label: "USD - Dólar estadounidense" },
  { value: "BOB", label: "BOB - Boliviano" },
  { value: "COP", label: "COP - Peso colombiano" },
  { value: "MXN", label: "MXN - Peso mexicano" },
  { value: "EUR", label: "EUR - Euro" },
];

const timezoneOptions = [
  { value: "America/La_Paz", label: "Bolivia (La Paz)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/New_York", label: "Este (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Los_Angeles", label: "Pacífico (Los Angeles)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
];

function normalizeScheduleForSave(values: UpdateClinicGeneralSettingsRequest) {
  const schedule = { ...values.schedule };

  for (const { key } of CLINIC_SCHEDULE_DAYS) {
    const day = schedule[key];
    if (!day?.enabled) {
      schedule[key] = { enabled: false, startTime: null, endTime: null };
    }
  }

  return schedule;
}

function findInvalidScheduleDay(values: UpdateClinicGeneralSettingsRequest): {
  dayKey: ClinicScheduleDayKey;
  message: string;
} | null {
  for (const { key, label } of CLINIC_SCHEDULE_DAYS) {
    const day = values.schedule?.[key];
    if (!day?.enabled) continue;

    if (!day.startTime || !day.endTime) {
      return {
        dayKey: key,
        message: `${label}: debe indicar hora de apertura y cierre.`,
      };
    }

    if (day.startTime >= day.endTime) {
      return {
        dayKey: key,
        message: `${label}: la apertura debe ser menor que el cierre.`,
      };
    }
  }

  return null;
}

export function GeneralSettings() {
  const [form] = Form.useForm<UpdateClinicGeneralSettingsRequest>();
  const { settings, loading, saving, error, reload, saveSettings } =
    useClinicGeneralSettings();
  const { can, isAdmin } = usePermission();

  const canEdit = isAdmin || can("general_option", PermissionAction.EDIT);

  useEffect(() => {
    if (!settings) return;

    form.setFieldsValue({
      name: settings.name,
      address: settings.address ?? undefined,
      phone: settings.phone ?? undefined,
      timezone: settings.timezone,
      currency: settings.currency,
      schedule: settings.schedule,
      minimumAdvanceNoticePeriod: settings.minimumAdvanceNoticePeriod ?? 120,
      standardAppointmentDuration: settings.standardAppointmentDuration ?? 30,
      cancellationLimitPerMonth: settings.cancellationLimitPerMonth ?? 3,
      allowOnlineReservations: settings.allowOnlineReservations ?? true,
      requireConfirmation: settings.requireConfirmation ?? false,
      sendReminders: settings.sendReminders ?? false,
      reminderTime: settings.reminderTime ?? 1440,
    });
  }, [form, settings]);

  const handleFinish = async (values: UpdateClinicGeneralSettingsRequest) => {
    const scheduleError = findInvalidScheduleDay(values);
    if (scheduleError) {
      form.setFields([
        {
          name: ["schedule", scheduleError.dayKey, "startTime"],
          errors: [scheduleError.message],
        },
      ]);
      form.scrollToField(["schedule", scheduleError.dayKey, "startTime"]);
      return;
    }

    const payload: UpdateClinicGeneralSettingsRequest = {
      ...values,
      name: values.name.trim(),
      address: values.address?.trim() || null,
      phone: values.phone?.trim() || null,
      schedule: normalizeScheduleForSave(values),
    };

    await saveSettings(payload);
  };

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <SectionTitle
          title="Opciones Generales"
          subtitle="Administra la configuración institucional y operativa de la clínica."
        />
        <PageCard>
          <Skeleton active paragraph={{ rows: 8 }} />
        </PageCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Opciones Generales"
        subtitle="Administra datos de la clínica, horarios y políticas base para la operación diaria."
      />

      {error && (
        <Alert
          type="error"
          showIcon
          title="No se pudo sincronizar la configuración"
          description={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={reload}>
              Reintentar
            </Button>
          }
        />
      )}

      {!canEdit && (
        <Alert
          type="warning"
          showIcon
          title="Solo lectura"
          description="No tienes permiso para editar las opciones generales. Puedes revisar la configuración actual."
        />
      )}

      <Form<UpdateClinicGeneralSettingsRequest>
        form={form}
        layout="vertical"
        disabled={!canEdit || saving}
        onFinish={handleFinish}
        onFinishFailed={(info) => {
          const firstError = info.errorFields[0]?.errors[0];
          if (firstError) {
            // AntD already marks the field; reject only prevents silent submits.
            return;
          }
        }}
      >
        <PageCard
          title="Datos de la clínica"
          subtitle="Información institucional visible en documentos internos y operación diaria."
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <FormInput
                name="name"
                label="Nombre de la clínica"
                placeholder="Ej: Clínica Dental San José"
                required
                maxLength={120}
                rules={[
                  { min: 2, message: "El nombre debe tener al menos 2 caracteres" },
                ]}
              />
            </Col>
            <Col xs={24} md={12}>
              <FormInput
                name="phone"
                label="Teléfono"
                placeholder="Ej: +591 70000000"
                type="tel"
                maxLength={30}
              />
            </Col>
            <Col xs={24}>
              <FormInput
                name="address"
                label="Dirección"
                placeholder="Dirección principal de la clínica"
                maxLength={255}
              />
            </Col>
          </Row>
        </PageCard>

        <PageCard
          title="Configuración regional"
          subtitle="Valores base para interpretar fechas, horarios y moneda de la clínica."
        >
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title="Alcance de HU-SET-001A"
            description="Esta entrega guarda moneda y zona horaria como fuente de verdad. Su aplicación completa en agenda, dashboard y reportes continúa en HU-SET-001B y HU-SET-001C."
          />
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <FormSelect
                name="currency"
                label="Moneda"
                required
                allowClear={false}
                options={currencyOptions}
              />
            </Col>
            <Col xs={24} md={12}>
              <FormSelect
                name="timezone"
                label="Zona horaria"
                required
                allowClear={false}
                options={timezoneOptions}
              />
            </Col>
          </Row>
          <Text type="secondary">
            Plan actual: <Tag>{settings?.subscriptionPlan || "Sin plan"}</Tag>
          </Text>
        </PageCard>

        <PageCard
          title="Horarios de atención"
          subtitle="Horario global de la clínica. El horario efectivo de citas se define junto con el horario de cada doctor."
        >
          <div className="space-y-4">
            {CLINIC_SCHEDULE_DAYS.map(({ key, label }) => (
              <ScheduleDayRow key={key} dayKey={key} label={label} />
            ))}
          </div>
        </PageCard>

        <PageCard
          title="Políticas base de citas"
          subtitle="Parámetros guardados para reglas operativas prospectivas. El enforcement completo continúa en HU-SET-001B."
          actions={[
            <Flex key="actions" justify="end" style={{ padding: "0 16px" }}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={reload} disabled={saving}>
                  Recargar
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={!canEdit}
                >
                  Guardar configuración
                </Button>
              </Space>
            </Flex>,
          ]}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="minimumAdvanceNoticePeriod"
                label="Anticipación mínima (minutos)"
                rules={[
                  {
                    type: "number",
                    min: 0,
                    message: "Debe ser mayor o igual a 0",
                  },
                ]}
              >
                <InputNumber min={0} precision={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="standardAppointmentDuration"
                label="Duración estándar (minutos)"
                rules={[
                  { required: true, message: "La duración estándar es requerida" },
                  {
                    type: "number",
                    min: 1,
                    message: "Debe ser mayor que 0",
                  },
                ]}
              >
                <InputNumber min={1} precision={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="cancellationLimitPerMonth"
                label="Cancelaciones por mes"
                rules={[
                  {
                    type: "number",
                    min: 0,
                    message: "Debe ser mayor o igual a 0",
                  },
                ]}
              >
                <InputNumber min={0} precision={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <FormSwitch
                name="allowOnlineReservations"
                label="Reservas en línea"
                checkedText="Activas"
                uncheckedText="Inactivas"
                help="Define si la clínica acepta reservas online."
              />
            </Col>
            <Col xs={24} md={8}>
              <FormSwitch
                name="requireConfirmation"
                label="Requiere confirmación"
                checkedText="Sí"
                uncheckedText="No"
                help="Aplica a reservas online futuras."
              />
            </Col>
            <Col xs={24} md={8}>
              <FormSwitch
                name="sendReminders"
                label="Enviar recordatorios"
                checkedText="Sí"
                uncheckedText="No"
                help="Activa recordatorios automáticos futuros."
              />
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue("sendReminders") ? (
                <Row gutter={[16, 0]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="reminderTime"
                      label="Recordatorio antes de la cita (minutos)"
                      rules={[
                        {
                          required: true,
                          message: "El tiempo de recordatorio es requerido",
                        },
                        {
                          type: "number",
                          min: 1,
                          message: "Debe ser mayor que 0",
                        },
                      ]}
                    >
                      <InputNumber min={1} precision={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null
            }
          </Form.Item>
        </PageCard>
      </Form>
    </div>
  );
}

function ScheduleDayRow({
  dayKey,
  label,
}: {
  dayKey: ClinicScheduleDayKey;
  label: string;
}) {
  return (
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue }) => {
        const enabled = getFieldValue(["schedule", dayKey, "enabled"]);

        return (
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} md={6}>
                <Text strong>{label}</Text>
              </Col>
              <Col xs={24} md={6}>
                <FormSwitch
                  name={["schedule", dayKey, "enabled"]}
                  checkedText="Abierto"
                  uncheckedText="Cerrado"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <FormTimePicker
                  name={["schedule", dayKey, "startTime"]}
                  label="Apertura"
                  disabled={!enabled}
                  required={Boolean(enabled)}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <FormTimePicker
                  name={["schedule", dayKey, "endTime"]}
                  label="Cierre"
                  disabled={!enabled}
                  required={Boolean(enabled)}
                />
              </Col>
            </Row>
          </div>
        );
      }}
    </Form.Item>
  );
}
