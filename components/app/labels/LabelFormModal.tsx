"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tag } from "lucide-react";
// Sin equivalente Bento: ColorPicker y Tooltip (este último lo usa IconPicker) se conservan de antd.
import { Tooltip, ColorPicker } from "antd";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
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
  "heart",
  "activity",
  "stethoscope",
  "pill",
  "thermometer",
  "syringe",
  // Urgencia / prioridad
  "alert-circle",
  "alert-triangle",
  "zap",
  "flame",
  // Personas
  "user",
  "users",
  "smile",
  "baby",
  // Tiempo / calendario
  "clock",
  "calendar",
  "timer",
  // Categorización
  "star",
  "tag",
  "bookmark",
  "flag",
  // Acciones / herramientas
  "scissors",
  "settings",
  "wrench",
  // Dinero / seguro
  "shield",
  "shield-off",
  "credit-card",
  "dollar-sign",
  // General
  "eye",
  "check-circle",
  "info",
  "bell",
  "file-text",
  "home",
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
            width: 36,
            height: 36,
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border:
              value === "" || !value
                ? "2px solid var(--color-brand)"
                : "1px solid var(--color-hairline)",
            background:
              value === "" || !value
                ? "rgb(var(--brand) / 0.15)"
                : "var(--color-hover)",
            color: "var(--color-subtle)",
            fontSize: 12,
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
                width: 36,
                height: 36,
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: isSelected
                  ? "2px solid var(--color-brand)"
                  : "1px solid var(--color-hairline)",
                background: isSelected ? "rgb(var(--brand) / 0.15)" : "var(--color-hover)",
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
  "#FF5733",
  "#FF8C00",
  "#FFC300",
  "#28B463",
  "#1ABC9C",
  "#3498DB",
  "#8E44AD",
  "#E91E63",
  "#607D8B",
  "#795548",
];

const labelSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres"),
  color: z.string().min(1, "El color es requerido"),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type LabelFormValues = z.infer<typeof labelSchema>;

export function LabelFormModal({
  isOpen,
  onClose,
  onSuccess,
  label,
}: LabelFormModalProps) {
  const isEdit = !!label;
  const { createLabel, loading: createLoading } = useCreateLabel();
  const [updateLoading, setUpdateLoading] = useState(false);

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    mode: "onBlur",
    defaultValues: {
      name: label?.name ?? "",
      color: label?.color ?? "#3498DB",
      description: label?.description ?? "",
      icon: label?.icon ?? "",
    },
  });

  // Live preview derivado de los valores del formulario.
  const previewName = form.watch("name");
  const previewColor = form.watch("color");
  const previewIcon = form.watch("icon");

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: label?.name ?? "",
        color: label?.color ?? "#3498DB",
        description: label?.description ?? "",
        icon: label?.icon ?? "",
      });
    }
  }, [isOpen, label, form]);

  const handleSubmit = async (values: LabelFormValues) => {
    if (isEdit && label) {
      setUpdateLoading(true);
      try {
        const updated = await labelsService.updateLabel(
          label.id,
          values as UpdateLabelDto,
        );
        onSuccess(updated);
        onClose();
      } catch {
        // error handled in service
      } finally {
        setUpdateLoading(false);
      }
    } else {
      const created = await createLabel(values as CreateLabelDto);
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
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      icon={<Tag className="h-5 w-5" />}
      title={isEdit ? "Editar etiqueta" : "Nueva etiqueta"}
      description="Personaliza el nombre, color e ícono de la etiqueta."
      className="w-full sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Urgencia"
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Color <span className="text-rose-500">*</span>
                  </FormLabel>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: c,
                            border:
                              previewColor === c
                                ? "2px solid var(--color-ink)"
                                : "2px solid transparent",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <div>
                      {/* Sin equivalente Bento: se conserva el ColorPicker de antd. */}
                      <ColorPicker
                        value={
                          field.value?.split(",")[0]?.substring(0, 7) ||
                          "#3498DB"
                        }
                        format="hex"
                        disabledAlpha
                        onChange={(color) => {
                          field.onChange(color.toHexString());
                        }}
                        showText
                      />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <TextArea
                      rows={2}
                      maxLength={255}
                      placeholder="Descripción breve"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícono (opcional)</FormLabel>
                  {/* Sin equivalente Bento: se conserva el IconPicker local. */}
                  <IconPicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Preview</p>
              <LabelChip
                label={{
                  id: "preview",
                  name: previewName || "Etiqueta",
                  color: previewColor || "#3498DB",
                  icon: previewIcon || undefined,
                }}
                size="md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar etiqueta
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
}
