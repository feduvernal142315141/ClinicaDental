"use client";

import { Card } from "@/components/ui/antd";
import {
  useServiceForm,
  type ServiceFormValues,
} from "@/lib/hooks/services/use-service-form";
import { Form, Input, InputNumber, Select, Switch } from "antd";
import {
  InfoCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { AvatarUpload } from "@/components/features/doctors";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import {
  SERVICE_TYPE_LABELS,
  SYMBOL_MODE_LABELS,
  SERVICE_CATEGORY_LABELS,
} from "@/lib/entity/services";
import type {
  ServiceType,
  OdontogramSymbolMode,
  ServiceCategory,
} from "@/lib/entity/services";

interface ServiceFormProps {
  serviceId?: string;
  basePath?: string;
}

const SERVICE_TYPE_OPTIONS = (
  Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]
).map(([value, label]) => ({ value, label }));

const SYMBOL_MODE_OPTIONS = (
  Object.entries(SYMBOL_MODE_LABELS) as [OdontogramSymbolMode, string][]
).map(([value, label]) => ({ value, label }));

const SERVICE_CATEGORY_OPTIONS = (
  Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][]
).map(([value, label]) => ({ value, label }));

function SectionHeader({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-800 leading-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function ServiceForm({
  serviceId,
  basePath = "/settings/services",
}: ServiceFormProps) {
  const {
    form,
    isEdit,
    loading,
    handleSubmit,
    handleCancel,
    symbolFileList,
    handleSymbolFileChange,
  } = useServiceForm({
    serviceId,
    basePath,
  });

  const odontogramEnabled = Form.useWatch("odontogramEnabled", form);
  const symbolMode = Form.useWatch("odontogramSymbolMode", form);

  return (
    <Form<ServiceFormValues>
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={loading}
      initialValues={{
        type: "TREATMENT" as ServiceType,
        cost: 0,
        odontogramEnabled: false,
        odontogramSymbolMode: "NONE" as OdontogramSymbolMode,
      }}
    >
      <div className="space-y-6">
        {/* Section 1: Información General */}
        <Card>
          <SectionHeader
            icon={<InfoCircleOutlined />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            title="Información General"
            subtitle="Detalles básicos de identificación del servicio."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form.Item
              label="Código"
              name="code"
              rules={[
                { required: true, message: "El código es obligatorio" },
                {
                  max: 20,
                  message: "El código debe tener máximo 20 caracteres",
                },
              ]}
            >
              <Input placeholder="Ej: SRV-001" />
            </Form.Item>

            <Form.Item
              label="Nombre"
              name="name"
              rules={[
                { required: true, message: "El nombre es obligatorio" },
                { min: 3, message: "El nombre debe tener mínimo 3 caracteres" },
                {
                  max: 100,
                  message: "El nombre debe tener máximo 100 caracteres",
                },
              ]}
            >
              <Input placeholder="Ej: Limpieza dental" />
            </Form.Item>
          </div>

        {/* Section 3: Configuración de Costos */}
          <SectionHeader
            icon={<DollarOutlined />}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            title="Configuración de Costos"
            subtitle="Estructura de precios y categorización."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form.Item
              label="Tipo de servicio"
              name="type"
              rules={[{ required: true, message: "El tipo es obligatorio" }]}
            >
              <Select
                options={SERVICE_TYPE_OPTIONS}
                placeholder="Seleccione tipo..."
              />
            </Form.Item>

            <Form.Item
              label="Costo"
              name="cost"
              rules={[
                { required: true, message: "El costo es obligatorio" },
                {
                  type: "number",
                  min: 0,
                  message: "El costo no puede ser negativo",
                },
              ]}
            >
              <InputNumber
                prefix="$"
                precision={2}
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </Form.Item>
          </div>

        {/* Section 4: Configuración de Odontograma */}
          <SectionHeader
            icon={<MedicineBoxOutlined />}
            iconBg="bg-gray-100"
            iconColor="text-gray-600"
            title="Configuración de Odontograma"
            subtitle="Mapeo visual en el historial dental."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form.Item
              label="Categoría odontograma"
              name="category"
              tooltip="Categoría clínica para sugerencias inteligentes en el odontograma"
            >
              <Select
                options={SERVICE_CATEGORY_OPTIONS}
                placeholder="Seleccione categoría"
                allowClear
              />
            </Form.Item>

            <div className="flex items-center justify-evenly rounded-xl bg-gray-100 px-4 py-3 h-fit self-end mb-6 ">
              <div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">
                  Visible en odontograma
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mostrar icono en el mapa dental
                </p>
              </div>
              <Form.Item
                name="odontogramEnabled"
                valuePropName="checked"
                className="m-auto items-center"
              >
                <Switch />
              </Form.Item>
            </div>
          </div>

          {odontogramEnabled && (
            <div className="border-t border-gray-100 pt-6 mt-2 space-y-4">
              <Form.Item
                label="Modo de símbolo"
                name="odontogramSymbolMode"
                rules={[
                  {
                    required: true,
                    message: "El modo de símbolo es obligatorio",
                  },
                ]}
              >
                <Select
                  options={SYMBOL_MODE_OPTIONS}
                  placeholder="Seleccione modo"
                />
              </Form.Item>

              {symbolMode === "ASSET" && (
                <Form.Item label="Imagen del símbolo" required>
                  <AvatarUpload
                    initialFileList={symbolFileList}
                    maxCount={1}
                    listType="picture-card"
                    size={120}
                    maxSizeMB={2}
                    allowedFormats={[
                      "image/jpeg",
                      "image/png",
                      "image/jpg",
                      "image/svg+xml",
                    ]}
                    onFileListChange={handleSymbolFileChange}
                  />
                </Form.Item>
              )}

              {symbolMode === "TEXT" && (
                <Form.Item
                  label="Texto del símbolo"
                  name="symbolText"
                  rules={[
                    {
                      required: true,
                      message: "El texto del símbolo es obligatorio",
                    },
                    { max: 5, message: "Máximo 5 caracteres" },
                  ]}
                >
                  <Input placeholder="Ej: LD" maxLength={5} />
                </Form.Item>
              )}
            </div>
          )}
        {/* Section 2: Descripción */}
          <SectionHeader
            icon={<FileTextOutlined />}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            title="Descripción"
            subtitle="Provea detalles adicionales sobre el procedimiento."
          />
          <Form.Item label="Descripción" name="description">
            <Input.TextArea
              rows={4}
              placeholder="Describa brevemente en qué consiste el servicio, indicaciones previas o duración aproximada..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Card>

        {/* Footer de acciones */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 px-6 py-4 flex justify-end gap-3 -mx-px rounded-b-lg">
          <FormActions
            loading={loading}
            onCancel={handleCancel}
            submitText={isEdit ? "Actualizar" : "Guardar Servicio"}
          />
        </div>
      </div>
    </Form>
  );
}
