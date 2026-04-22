"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, Tooltip } from "antd";
import { DynamicIcon } from "./DynamicIcon";
import { LabelChip } from "./LabelChip";
import { useCreateLabel } from "@/lib/hooks/labels";
import { labelsService } from "@/lib/services/labels";
import type { Label, CreateLabelDto, UpdateLabelDto } from "@/lib/entity/label";

interface LabelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (label: Label) => void;
  label?: Label;
}

const AVAILABLE_ICONS = [
  // Salud y clínica
  "heart", "activity", "stethoscope", "pill", "thermometer", "syringe",
  // Urgencia / prioridad
  "alert-circle", "alert-triangle", "zap", "flame",
  // Personas
  "user", "users", "smile", "baby",
  // Tiempo / calendario
  "clock", "calendar", "timer",
  // Categorización
  "star", "tag", "bookmark", "flag",
  // Acciones / herramientas
  "scissors", "settings", "wrench",
  // Dinero / seguro
  "shield", "shield-off", "credit-card", "dollar-sign",
  // General
  "eye", "check-circle", "info", "bell", "file-text", "home",
];

interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Tooltip title="Sin ícono">
        <div
          onClick={() => onChange?.("")}
          style={{
            width: 36, height: 36, borderRadius: 6, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: value === "" || !value ? "2px solid #1890ff" : "1px solid #d9d9d9",
            background: value === "" || !value ? "#e6f4ff" : "#fafafa",
            color: "#595959", fontSize: 12,
          }}
        >
          –
        </div>
      </Tooltip>
      {AVAILABLE_ICONS.map((iconName) => {
        const isSelected = value === iconName;
        return (
          <Tooltip key={iconName} title={iconName}>
            <div
              onClick={() => onChange?.(iconName)}
              style={{
                width: 36, height: 36, borderRadius: 6, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isSelected ? "2px solid #1890ff" : "1px solid #d9d9d9",
                background: isSelected ? "#e6f4ff" : "#fafafa",
                fontSize: 18,
              }}
            >
              <DynamicIcon name={iconName} size={22} />
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

const PRESET_COLORS = [
  "#FF5733", "#FF8C00", "#FFC300", "#28B463", "#1ABC9C",
  "#3498DB", "#8E44AD", "#E91E63", "#607D8B", "#795548",
];

export function LabelFormModal({ isOpen, onClose, onSuccess, label }: LabelFormModalProps) {
  const [form] = Form.useForm<CreateLabelDto>();
  const isEdit = !!label;
  const { createLabel, loading: createLoading } = useCreateLabel();
  const [updateLoading, setUpdateLoading] = useState(false);

  // Live preview state
  const [previewName, setPreviewName] = useState(label?.name ?? "");
  const [previewColor, setPreviewColor] = useState(label?.color ?? "#3498DB");
  const [previewIcon, setPreviewIcon] = useState(label?.icon ?? "");

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        name: label?.name ?? "",
        color: label?.color ?? "#3498DB",
        description: label?.description ?? "",
        icon: label?.icon ?? "",
      });
      setPreviewName(label?.name ?? "");
      setPreviewColor(label?.color ?? "#3498DB");
      setPreviewIcon(label?.icon ?? "");
    }
  }, [isOpen, label, form]);

  const handleSubmit = async (values: CreateLabelDto) => {
    if (isEdit && label) {
      setUpdateLoading(true);
      try {
        const updated = await labelsService.updateLabel(label.id, values as UpdateLabelDto);
        onSuccess(updated);
        onClose();
      } catch {
        // error handled in service
      } finally {
        setUpdateLoading(false);
      }
    } else {
      const created = await createLabel(values);
      if (created) {
        onSuccess(created);
        onClose();
      }
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={isEdit ? "Editar etiqueta" : "Nueva etiqueta"}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={(_, allValues) => {
          setPreviewName(allValues.name ?? "");
          setPreviewColor(allValues.color ?? "#3498DB");
          setPreviewIcon(allValues.icon ?? "");
        }}
      >
        <Form.Item
          name="name"
          label="Nombre"
          rules={[
            { required: true, message: "El nombre es requerido" },
            { max: 50, message: "Máximo 50 caracteres" },
          ]}
        >
          <Input placeholder="Ej. Urgencia" maxLength={50} />
        </Form.Item>

        <Form.Item name="color" label="Color" rules={[{ required: true, message: "El color es requerido" }]}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    form.setFieldValue("color", c);
                    setPreviewColor(c);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: c,
                    border: previewColor === c ? "2px solid #000" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
            <Input
              value={previewColor}
              onChange={(e) => {
                form.setFieldValue("color", e.target.value);
                setPreviewColor(e.target.value);
              }}
              placeholder="#FF5733"
              maxLength={7}
              style={{ width: 120 }}
            />
          </div>
        </Form.Item>

        <Form.Item name="description" label="Descripción (opcional)">
          <Input.TextArea rows={2} maxLength={255} placeholder="Descripción breve" />
        </Form.Item>

        <Form.Item name="icon" label="Ícono (opcional)">
          <IconPicker value={previewIcon} onChange={(v) => { setPreviewIcon(v); form.setFieldValue("icon", v); }} />
        </Form.Item>

        {/* Live preview */}
        <Form.Item label="Preview">
          <LabelChip
            label={{
              id: "preview",
              name: previewName || "Etiqueta",
              color: previewColor || "#3498DB",
              icon: previewIcon || undefined,
            }}
            size="md"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar etiqueta
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
