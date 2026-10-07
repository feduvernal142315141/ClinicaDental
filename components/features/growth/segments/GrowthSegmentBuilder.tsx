"use client";

import { useCallback, useEffect, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button, Card, CardContent } from "@/components/ui";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Input } from "@/components/ui";
import { Select } from "@/components/ui/controls/select";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";
import { SEGMENT_FIELD_OPTIONS, SEGMENT_OPERATOR_LABELS } from "@/lib/entity/growth/segments";
import type { GrowthSegmentFormValues } from "@/lib/hooks/growth";
import type { SelectOption } from "@/components/ui/controls/select";
import { doctorsService } from "@/lib/services/doctors";
import { servicesService } from "@/lib/services/services";

interface GrowthSegmentBuilderProps {
  form: UseFormReturn<GrowthSegmentFormValues>;
}

const fieldOptions: SelectOption[] = SEGMENT_FIELD_OPTIONS.map((f) => ({
  value: f.value,
  label: f.label,
}));

function getOperatorOptions(fieldValue: string): SelectOption[] {
  const fieldMeta = SEGMENT_FIELD_OPTIONS.find((f) => f.value === fieldValue);
  if (!fieldMeta) return [];
  return fieldMeta.operators.map((op) => ({
    value: op,
    label: SEGMENT_OPERATOR_LABELS[op],
  }));
}

function getFieldMeta(fieldValue: string) {
  return SEGMENT_FIELD_OPTIONS.find((f) => f.value === fieldValue);
}

export function GrowthSegmentBuilder({ form }: GrowthSegmentBuilderProps) {
  const { t } = useI18n();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  // Load doctors and services for UUID selects
  const [doctorOptions, setDoctorOptions] = useState<SelectOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    doctorsService
      .getDoctors({ page: 0, pageSize: 200 })
      .then((res) => {
        const entities = res?.entities ?? [];
        setDoctorOptions(
          entities.map((d) => ({ value: d.id, label: d.name })),
        );
      })
      .catch(() => {});
    servicesService
      .getServices({ page: 0, pageSize: 200 })
      .then((res) => {
        const entities = res?.entities ?? [];
        setServiceOptions(
          entities.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })),
        );
      })
      .catch(() => {});
  }, []);

  const handleAddCondition = useCallback(() => {
    append({ field: "", operator: "", value: "" });
  }, [append]);

  /** Get the Select options for a UUID field, if available. */
  function getUuidOptions(fieldValue: string): SelectOption[] | null {
    if (fieldValue === "doctorId") return doctorOptions;
    if (fieldValue === "serviceId") return serviceOptions;
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">
          {t("growth.segments.conditions")}{" "}
          <span className="text-subtle font-normal">{t("growth.segments.conditionsHint")}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCondition}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("growth.segments.addCondition")}
        </Button>
      </div>

      {fields.map((field, index) => {
        const watchedField = form.watch(`conditions.${index}.field`);
        const watchedOperator = form.watch(`conditions.${index}.operator`);
        const fieldMeta = getFieldMeta(watchedField);
        const operatorOptions = getOperatorOptions(watchedField);
        const isUnary = watchedOperator === "IS_NULL" || watchedOperator === "IS_NOT_NULL";
        const uuidOptions = getUuidOptions(watchedField);

        return (
          <Card key={field.id} className="relative">
            <CardContent className="pt-4 pb-4">
              {index > 0 && (
                <p className="text-xs text-subtle font-medium mb-3">{t("growth.segments.and")}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
                {/* Field */}
                <FormField
                  control={form.control}
                  name={`conditions.${index}.field`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("growth.segments.field")}</FormLabel>
                      <FormControl>
                        <Select
                          value={f.value as string}
                          onChange={(v) => {
                            f.onChange(v);
                            form.setValue(`conditions.${index}.operator`, "");
                            const meta = getFieldMeta(v);
                            const isNumeric = meta?.valueType === "number" || meta?.valueType === "decimal";
                            form.setValue(`conditions.${index}.value`, isNumeric ? 0 : "");
                          }}
                          onBlur={f.onBlur}
                          options={fieldOptions}
                          placeholder={t("growth.segments.fieldPlaceholder")}
                          searchable
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Operator */}
                <FormField
                  control={form.control}
                  name={`conditions.${index}.operator`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("growth.segments.operator")}</FormLabel>
                      <FormControl>
                        <Select
                          value={f.value as string}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          options={operatorOptions}
                          placeholder={t("growth.segments.operatorPlaceholder")}
                          disabled={!watchedField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Value */}
                {!isUnary && (
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.value`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{t("growth.segments.value")}</FormLabel>
                        <FormControl>
                          {watchedOperator === "BETWEEN" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={String(Array.isArray(f.value) ? f.value[0] ?? "" : "")}
                                onChange={(e) => {
                                  const arr = Array.isArray(f.value) ? [...f.value] : ["", ""];
                                  arr[0] = Number(e.target.value) || 0;
                                  f.onChange(arr);
                                }}
                                onBlur={f.onBlur}
                                placeholder={t("settings.schedule.from")}
                              />
                              <span className="text-xs text-subtle">{t("growth.segments.andLower")}</span>
                              <Input
                                type="number"
                                value={String(Array.isArray(f.value) ? f.value[1] ?? "" : "")}
                                onChange={(e) => {
                                  const arr = Array.isArray(f.value) ? [...f.value] : ["", ""];
                                  arr[1] = Number(e.target.value) || 0;
                                  f.onChange(arr);
                                }}
                                onBlur={f.onBlur}
                                placeholder={t("settings.schedule.to")}
                              />
                            </div>
                          ) : watchedOperator === "IN" || watchedOperator === "NOT_IN" ? (
                            <Input
                              value={Array.isArray(f.value) ? f.value.join(", ") : String(f.value)}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
                                f.onChange(items);
                              }}
                              onBlur={f.onBlur}
                              placeholder="valor1, valor2, …"
                            />
                          ) : fieldMeta?.valueType === "boolean" ? (
                            <Select
                              value={String(f.value)}
                              onChange={(v) => f.onChange(v === "true")}
                              onBlur={f.onBlur}
                              options={[
                                { value: "true", label: t("growth.segments.yes") },
                                { value: "false", label: t("growth.segments.no") },
                              ]}
                              placeholder={t("growth.segments.valuePlaceholder")}
                            />
                          ) : uuidOptions ? (
                            <Select
                              value={String(f.value)}
                              onChange={f.onChange}
                              onBlur={f.onBlur}
                              options={uuidOptions}
                              placeholder={watchedField === "doctorId" ? t("growth.segments.doctorPlaceholder") : t("growth.segments.servicePlaceholder")}
                              searchable
                            />
                          ) : fieldMeta?.valueType === "number" || fieldMeta?.valueType === "decimal" ? (
                            <Input
                              type="number"
                              value={String(f.value)}
                              onChange={(e) => {
                                const v = e.target.value;
                                f.onChange(v === "" ? "" : Number(v));
                              }}
                              onBlur={f.onBlur}
                              placeholder="0"
                              step={fieldMeta?.valueType === "decimal" ? "0.01" : "1"}
                            />
                          ) : (
                            <Input
                              value={String(f.value)}
                              onChange={(e) => f.onChange(e.target.value)}
                              onBlur={f.onBlur}
                              placeholder={t("growth.segments.value")}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Remove */}
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length <= 1}
                    title={t("growth.segments.deleteCondition")}
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
