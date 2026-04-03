"use client";

import { Card } from "@/components/ui/antd";
import {
  useServiceForm,
  type ServiceFormValues,
} from "@/lib/hooks/services/use-service-form";
import {
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
} from "antd";
import { AvatarUpload } from "@/components/features/doctors";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import { SERVICE_TYPE_LABELS, SYMBOL_MODE_LABELS } from "@/lib/entity/services";
import type { ServiceType, OdontogramSymbolMode } from "@/lib/entity/services";

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
      <Card
        actions={[
          <Flex key="actions" justify="end" style={{ padding: "0 16px" }}>
            <FormActions
              loading={loading}
              onCancel={handleCancel}
              submitText={isEdit ? "Actualizar" : "Guardar"}
            />
          </Flex>,
        ]}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                {
                  min: 3,
                  message: "El nombre debe tener mínimo 3 caracteres",
                },
                {
                  max: 100,
                  message: "El nombre debe tener máximo 100 caracteres",
                },
              ]}
            >
              <Input placeholder="Ej: Limpieza dental" />
            </Form.Item>
          </div>

          <Form.Item label="Descripción" name="description">
            <Input.TextArea
              rows={3}
              placeholder="Descripción del servicio (opcional)"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              label="Tipo de servicio"
              name="type"
              rules={[{ required: true, message: "El tipo es obligatorio" }]}
            >
              <Select options={SERVICE_TYPE_OPTIONS} placeholder="Seleccione" />
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

          <Divider>Configuración de Odontograma</Divider>

          <Form.Item
            label="Visible en odontograma"
            name="odontogramEnabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {odontogramEnabled && (
            <>
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
                    {
                      max: 5,
                      message: "Máximo 5 caracteres",
                    },
                  ]}
                >
                  <Input placeholder="Ej: LD" maxLength={5} />
                </Form.Item>
              )}
            </>
          )}
        </Space>
      </Card>
    </Form>
  );
}
