"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription, Button, Card, CardContent } from "@/components/ui";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Select } from "@/components/ui/controls/select";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";
import {
  SEGMENT_MAX_CONDITIONS,
  findSegmentField,
  isListSegmentOperator,
  isUnarySegmentOperator,
  segmentFieldChoices,
  segmentFieldLabel,
  segmentOperatorLabel,
  segmentValueLabel,
  sortSegmentOperators,
  type SegmentFieldDefinition,
} from "@/lib/entity/growth";
import type { GrowthSegmentFormValues } from "@/lib/hooks/growth";
import type { SelectOption } from "@/components/ui/controls/select";
import { LinesSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import { doctorsService } from "@/lib/services/doctors";
import { servicesService } from "@/lib/services/services";
import { SegmentValueControl } from "./SegmentValueControl";

interface GrowthSegmentBuilderProps {
  form: UseFormReturn<GrowthSegmentFormValues>;
  /** Fields of the segment audience, from the backend catalog. */
  fields: SegmentFieldDefinition[] | undefined;
  fieldsLoading: boolean;
  fieldsError: string | null;
  /** Backend message about the conditions (field of another audience, invalid filter). */
  conditionsError: string | null;
}

/** Fields whose value is a person of the clinic or a service: the screen offers a selector. */
const USER_FIELDS = new Set(["doctorId", "assignedToUserId"]);
const SERVICE_FIELDS = new Set(["serviceId", "interestServiceId"]);

export function GrowthSegmentBuilder({
  form,
  fields,
  fieldsLoading,
  fieldsError,
  conditionsError,
}: GrowthSegmentBuilderProps) {
  const { t } = useI18n();
  const { fields: rows, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  // Load users and services for UUID selects
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    doctorsService
      .getDoctors({ page: 0, pageSize: 200 })
      .then((res) => {
        const entities = res?.entities ?? [];
        setUserOptions(
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

  const fieldOptions: SelectOption[] = useMemo(
    () => (fields ?? []).map((f) => ({ value: f.field, label: segmentFieldLabel(f.field) })),
    [fields],
  );

  const handleAddCondition = useCallback(() => {
    append({ field: "", operator: "", value: "" });
  }, [append]);

  /** Closed list of values for a field, or `null` when the value is free. */
  function getValueOptions(definition: SegmentFieldDefinition): SelectOption[] | null {
    if (USER_FIELDS.has(definition.field)) return userOptions;
    if (SERVICE_FIELDS.has(definition.field)) return serviceOptions;
    const choices = segmentFieldChoices(definition);
    return choices ? choices.map((value) => ({ value, label: segmentValueLabel(definition.field, value) })) : null;
  }

  const full = rows.length >= SEGMENT_MAX_CONDITIONS;

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
          disabled={full || !fields}
          title={full ? `Un segmento admite hasta ${SEGMENT_MAX_CONDITIONS} condiciones` : undefined}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("growth.segments.addCondition")}
        </Button>
      </div>

      {fieldsError && (
        <Alert variant="destructive">
          <AlertDescription>{fieldsError}</AlertDescription>
        </Alert>
      )}

      {conditionsError && (
        <Alert variant="destructive">
          <AlertDescription>{conditionsError}</AlertDescription>
        </Alert>
      )}

      {fieldsLoading && !fieldsError && <LinesSkeleton lines={3} label="Cargando campos…" />}

      {fields && rows.map((row, index) => {
        const watchedField = form.watch(`conditions.${index}.field`);
        const watchedOperator = form.watch(`conditions.${index}.operator`);
        const definition = findSegmentField(fields, watchedField);
        const operatorOptions: SelectOption[] = definition
          ? sortSegmentOperators(definition.operators).map((op) => ({
              value: op,
              label: segmentOperatorLabel(definition.field, op),
            }))
          : [];
        const isUnary = isUnarySegmentOperator(watchedOperator);
        // A saved field that this audience no longer offers stays visible so it can be replaced.
        const rowFieldOptions =
          watchedField && !definition
            ? [...fieldOptions, { value: watchedField, label: segmentFieldLabel(watchedField) }]
            : fieldOptions;

        return (
          <Card key={row.id} className="relative">
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
                            form.setValue(`conditions.${index}.value`, "");
                            form.clearErrors(`conditions.${index}`);
                          }}
                          onBlur={f.onBlur}
                          options={rowFieldOptions}
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
                          onChange={(v) => {
                            // A list, a range and a single value are different shapes: start clean.
                            const reshaped =
                              isListSegmentOperator(v) !== isListSegmentOperator(f.value as string) ||
                              (v === "BETWEEN") !== (f.value === "BETWEEN");
                            f.onChange(v);
                            if (reshaped || isUnarySegmentOperator(v)) {
                              form.setValue(`conditions.${index}.value`, isListSegmentOperator(v) ? [] : "");
                            }
                            form.clearErrors(`conditions.${index}.value`);
                          }}
                          onBlur={f.onBlur}
                          options={operatorOptions}
                          placeholder={t("growth.segments.operatorPlaceholder")}
                          disabled={!definition}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Value */}
                {!isUnary && definition && watchedOperator ? (
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.value`}
                    render={({ field: f, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{t("growth.segments.value")}</FormLabel>
                        <FormControl>
                          <SegmentValueControl
                            definition={definition}
                            operator={watchedOperator}
                            value={f.value}
                            onChange={f.onChange}
                            onBlur={f.onBlur}
                            options={getValueOptions(definition)}
                            label={`${t("growth.segments.value")}: ${segmentFieldLabel(definition.field)}`}
                            invalid={!!fieldState.error}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div aria-hidden className="hidden sm:block" />
                )}

                {/* Remove */}
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => rows.length > 1 && remove(index)}
                    disabled={rows.length <= 1}
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
