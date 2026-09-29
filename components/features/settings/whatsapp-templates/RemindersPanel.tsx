"use client";

import * as React from "react";
import {
  Plus,
  Clock,
  Loader2,
  Trash2,
  Bell,
  BellOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import { Switch } from "@/components/ui/atomic/forms/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import type {
  ReminderConfigResponse,
  ClinicTemplate,
} from "@/lib/entity/settings";

// ── Types ─────────────────────────────────────────────────────────────────

export interface RemindersPanelProps {
  reminders: ReminderConfigResponse[];
  templates: ClinicTemplate[];
  loading: boolean;
  saving: boolean;
  onAdd: (minutes: number, templateId: string) => Promise<void>;
  onUpdate: (id: string, data: { reminderMinutesBefore?: number; templateId?: string }) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onDelete: (id: string) => void;
}

// ── Time presets ──────────────────────────────────────────────────────────

const TIME_PRESETS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 720, label: "12 horas" },
  { value: 1440, label: "24 horas" },
  { value: 2880, label: "48 horas" },
] as const;

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 hora" : `${h} horas`;
  return `${h}h ${m}min`;
}

function getStatusConfig(status?: string): { label: string; className: string } | null {
  switch (status) {
    case "APPROVED":
      return { label: "Aprobada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "PENDING":
      return { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "REJECTED":
      return { label: "Rechazada", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export function RemindersPanel({
  reminders,
  templates,
  loading,
  saving,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: RemindersPanelProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state
  const [formMinutes, setFormMinutes] = React.useState(1440);
  const [formCustomMinutes, setFormCustomMinutes] = React.useState("");
  const [formTemplateId, setFormTemplateId] = React.useState("");
  const [isCustom, setIsCustom] = React.useState(false);

  const approvedTemplates = templates.filter(
    (t) => t.metaTemplateStatus === "APPROVED" && t.provider === "META",
  );

  const getTemplateName = (id: string) =>
    templates.find((t) => t.id === id)?.name ?? id;

  const getTemplateStatus = (id: string) =>
    templates.find((t) => t.id === id)?.metaTemplateStatus;

  const resetForm = () => {
    setFormMinutes(1440);
    setFormCustomMinutes("");
    setFormTemplateId("");
    setIsCustom(false);
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r: ReminderConfigResponse) => {
    const isPreset = TIME_PRESETS.some((p) => p.value === r.reminderMinutesBefore);
    setFormMinutes(isPreset ? r.reminderMinutesBefore : 0);
    setIsCustom(!isPreset);
    setFormCustomMinutes(!isPreset ? String(r.reminderMinutesBefore) : "");
    setFormTemplateId(r.templateId);
    setEditingId(r.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = async () => {
    const minutes = isCustom ? parseInt(formCustomMinutes) || 0 : formMinutes;
    if (!minutes || !formTemplateId) return;

    if (editingId) {
      await onUpdate(editingId, { reminderMinutesBefore: minutes, templateId: formTemplateId });
    } else {
      await onAdd(minutes, formTemplateId);
    }
    closeForm();
  };

  const effectiveMinutes = isCustom ? parseInt(formCustomMinutes) || 0 : formMinutes;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Recordatorios de citas</h3>
          <p className="mt-0.5 text-xs text-subtle">
            Envía recordatorios automáticos antes de cada cita
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate} disabled={saving}>
          <Plus className="size-4 mr-1.5" />
          Agregar
        </Button>
      </div>

      {/* Reminder list */}
      {reminders.length === 0 && !showForm ? (
        <EmptyState
          icon={Bell}
          title="Sin recordatorios"
          description="Configura cuándo enviar recordatorios automáticos a los pacientes."
          className="py-16"
        />
      ) : (
        <div className="divide-y divide-hairline">
          {reminders.map((r) => {
            const tplStatus = getStatusConfig(getTemplateStatus(r.templateId));
            const isEditing = editingId === r.id && showForm;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => { if (!isEditing) openEdit(r); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !isEditing) openEdit(r); }}
                className={cn(
                  "flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-hover",
                  !r.enabled && "opacity-50",
                  isEditing && "bg-brand/[0.04] dark:bg-brand/[0.08]",
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  r.enabled ? "bg-brand/10" : "bg-hover",
                )}>
                  {r.enabled
                    ? <Bell className="size-[18px] text-brand" />
                    : <BellOff className="size-[18px] text-subtle" />
                  }
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">
                      {formatMinutes(r.reminderMinutesBefore)} antes
                    </span>
                    {tplStatus && (
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tplStatus.className)}>
                        {tplStatus.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    Plantilla: <span className="font-medium text-ink">{getTemplateName(r.templateId)}</span>
                  </p>
                </div>

                {/* Actions — stop propagation so clicks don't trigger row edit */}
                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(checked) => onToggle(r.id, checked)}
                    disabled={saving}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(r.id)} disabled={saving} aria-label="Eliminar">
                    <Trash2 className="size-3.5 text-subtle hover:text-rose-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="border-t border-hairline bg-canvas">
          <div className="px-5 py-4">
            {/* Form header */}
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">
                {editingId ? "Editar recordatorio" : "Nuevo recordatorio"}
              </h4>
              <Button type="button" variant="ghost" size="icon" onClick={closeForm} aria-label="Cerrar">
                <X className="size-4" />
              </Button>
            </div>

            {/* Time selection */}
            <div className="space-y-3">
              <Label className="text-xs">Cuánto antes de la cita</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => { setFormMinutes(preset.value); setIsCustom(false); }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      !isCustom && formMinutes === preset.value
                        ? "bg-brand text-white"
                        : "bg-hover text-subtle hover:text-ink",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setIsCustom(true); setFormMinutes(0); }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    isCustom
                      ? "bg-brand text-white"
                      : "bg-hover text-subtle hover:text-ink",
                  )}
                >
                  Personalizado
                </button>
              </div>

              {isCustom && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={formCustomMinutes}
                    onChange={(e) => setFormCustomMinutes(e.target.value)}
                    placeholder="Minutos"
                    className="w-32 text-sm"
                  />
                  <span className="text-xs text-subtle">
                    minutos
                    {parseInt(formCustomMinutes) > 0 && (
                      <span className="ml-1 font-medium text-ink">
                        ({formatMinutes(parseInt(formCustomMinutes))})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Template selection */}
            <div className="mt-4 space-y-1.5">
              <Label className="text-xs">Plantilla de WhatsApp</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.length > 0 ? (
                    approvedTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-subtle">
                      No hay plantillas aprobadas
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {effectiveMinutes > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-hover p-3">
                <Clock className="size-4 shrink-0 text-brand" />
                <p className="text-xs text-ink">
                  Se enviará <span className="font-semibold">{formatMinutes(effectiveMinutes)}</span> antes de cada cita
                  {formTemplateId && (
                    <> usando <span className="font-semibold">{getTemplateName(formTemplateId)}</span></>
                  )}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !effectiveMinutes || !formTemplateId}
              >
                {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {editingId ? "Guardar cambios" : "Agregar recordatorio"}
              </Button>
              <Button size="sm" variant="outline" onClick={closeForm} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
