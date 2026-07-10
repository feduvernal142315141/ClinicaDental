"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requiredText } from "@/lib/validation/fields";
import { Tag, Check, Ban } from "lucide-react";
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
import { cn } from "@/lib/utils/utils";
import { DynamicIcon } from "./DynamicIcon";
import { LabelChip } from "./LabelChip";
import { useCreateLabel, useUpdateLabel } from "@/lib/hooks/labels";
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
  const isNone = !value;
  const tileBase =
    "grid h-9 w-9 place-items-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/45";
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange?.("")}
        title="Sin ícono"
        aria-label="Sin ícono"
        aria-pressed={isNone}
        className={cn(
          tileBase,
          isNone
            ? "border-brand bg-brand/10 text-brand"
            : "border-hairline bg-hover text-subtle hover:border-brand/40 hover:text-ink",
        )}
      >
        <Ban className="h-4 w-4" />
      </button>
      {AVAILABLE_ICONS.map((iconName) => {
        const selected = value === iconName;
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange?.(iconName)}
            title={iconName.replace(/-/g, " ")}
            aria-label={iconName.replace(/-/g, " ")}
            aria-pressed={selected}
            className={cn(
              tileBase,
              selected
                ? "border-brand bg-brand/10 text-brand"
                : "border-hairline bg-hover text-ink hover:border-brand/40",
            )}
          >
            <DynamicIcon name={iconName} size={18} />
          </button>
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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const labelSchema = z.object({
  name: requiredText({ min: 1, max: 50, label: "El nombre" }),
  color: z.string().regex(HEX_RE, "Usa un color válido (#RRGGBB)"),
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
  const { updateLabel, loading: updateLoading } = useUpdateLabel(label?.id ?? "");

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
    const payload = { ...values, icon: values.icon || undefined };
    if (isEdit && label) {
      const updated = await updateLabel(payload as UpdateLabelDto);
      if (updated) {
        onSuccess(updated);
        onClose();
      }
    } else {
      const created = await createLabel(payload as CreateLabelDto);
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
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
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
                    <Input placeholder="Ej. Urgencia" maxLength={50} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => {
                const safeHex = HEX_RE.test(field.value ?? "")
                  ? (field.value as string)
                  : "#3498DB";
                return (
                  <FormItem>
                    <FormLabel>
                      Color <span className="text-rose-500">*</span>
                    </FormLabel>
                    <div className="space-y-3">
                      {/* Swatches preestablecidos */}
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => {
                          const active =
                            (field.value ?? "").toUpperCase() === c.toUpperCase();
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => field.onChange(c)}
                              aria-label={c}
                              aria-pressed={active}
                              className={cn(
                                "grid h-7 w-7 place-items-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand/45",
                                active &&
                                  "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                              )}
                              style={{ backgroundColor: c }}
                            >
                              {active && (
                                <Check className="h-3.5 w-3.5 text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.5))]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {/* Color personalizado (input nativo) + hex */}
                      <div className="flex items-center gap-2">
                        <label
                          className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-hairline"
                          title="Color personalizado"
                        >
                          <span
                            className="h-5 w-5 rounded"
                            style={{ backgroundColor: safeHex }}
                          />
                          <input
                            type="color"
                            value={safeHex}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                            className="absolute inset-0 cursor-pointer opacity-0"
                            aria-label="Selector de color personalizado"
                          />
                        </label>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          placeholder="#3498DB"
                          maxLength={7}
                          className="w-32 font-mono uppercase"
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
                  <IconPicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Vista previa</p>
              <div className="flex items-center justify-center rounded-xl border border-hairline bg-canvas px-4 py-5">
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
