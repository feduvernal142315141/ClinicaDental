"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui";
import { MultiSelect } from "@/components/ui/controls/multi-select";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import {
  SEGMENT_MAX_LIST_VALUES,
  isListSegmentOperator,
  type SegmentConditionValue,
  type SegmentFieldDefinition,
} from "@/lib/entity/growth";

interface SegmentValueControlProps {
  definition: SegmentFieldDefinition;
  operator: string;
  value: SegmentConditionValue | undefined;
  onChange: (value: SegmentConditionValue) => void;
  onBlur: () => void;
  /** Closed list for this field (catalog values, services, users); `null` = free value. */
  options: SelectOption[] | null;
  label: string;
  invalid?: boolean;
}

function asList(value: SegmentConditionValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === "" ? [] : [String(value)];
}

/**
 * Value of one condition. The control follows the field type and the operator; the value is
 * typed for the backend when saving (`buildSegmentConditions`), not here.
 */
export function SegmentValueControl({
  definition,
  operator,
  value,
  onChange,
  onBlur,
  options,
  label,
  invalid,
}: SegmentValueControlProps) {
  const numeric = definition.valueType === "INTEGER" || definition.valueType === "DECIMAL";
  const step = definition.valueType === "DECIMAL" ? "0.01" : "1";

  if (operator === "BETWEEN") {
    const pair = Array.isArray(value) ? value : ["", ""];
    const setAt = (index: number, raw: string) => {
      const next: (string | number)[] = [pair[0] ?? "", pair[1] ?? ""];
      next[index] = raw === "" ? "" : Number(raw);
      onChange(next);
    };
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={step}
          value={String(pair[0] ?? "")}
          onChange={(e) => setAt(0, e.target.value)}
          onBlur={onBlur}
          placeholder="Desde"
          aria-label={`${label}: desde`}
          aria-invalid={invalid}
        />
        <span className="text-xs text-subtle">y</span>
        <Input
          type="number"
          min={0}
          step={step}
          value={String(pair[1] ?? "")}
          onChange={(e) => setAt(1, e.target.value)}
          onBlur={onBlur}
          placeholder="Hasta"
          aria-label={`${label}: hasta`}
          aria-invalid={invalid}
        />
      </div>
    );
  }

  if (isListSegmentOperator(operator)) {
    if (options) {
      return (
        <MultiSelect
          value={asList(value)}
          onChange={(next) => onChange(next.slice(0, SEGMENT_MAX_LIST_VALUES))}
          onBlur={onBlur}
          options={options}
          placeholder="Elige uno o varios…"
          aria-label={label}
          aria-invalid={invalid}
        />
      );
    }
    return (
      <SegmentValueTags
        values={asList(value)}
        onChange={onChange}
        onBlur={onBlur}
        numeric={numeric}
        label={label}
        invalid={invalid}
      />
    );
  }

  if (definition.valueType === "BOOLEAN") {
    return (
      <Select
        value={value === undefined || value === "" ? "" : String(value)}
        onChange={(next) => onChange(next === "true")}
        onBlur={onBlur}
        options={[
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ]}
        placeholder="Valor..."
        aria-label={label}
      />
    );
  }

  if (options) {
    return (
      <Select
        value={Array.isArray(value) || value === undefined ? "" : String(value)}
        onChange={onChange}
        onBlur={onBlur}
        options={options}
        placeholder="Elige un valor…"
        searchable={options.length > 6}
        aria-label={label}
      />
    );
  }

  if (numeric) {
    return (
      <Input
        type="number"
        min={0}
        step={step}
        value={Array.isArray(value) || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={onBlur}
        placeholder="0"
        aria-label={label}
        aria-invalid={invalid}
      />
    );
  }

  return (
    <Input
      value={Array.isArray(value) || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="Valor"
      aria-label={label}
      aria-invalid={invalid}
    />
  );
}

/** Several free values (a field without a closed list): type one and press Enter or comma. */
function SegmentValueTags({
  values,
  onChange,
  onBlur,
  numeric,
  label,
  invalid,
}: {
  values: string[];
  onChange: (value: SegmentConditionValue) => void;
  onBlur: () => void;
  numeric: boolean;
  label: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const full = values.length >= SEGMENT_MAX_LIST_VALUES;

  const commit = () => {
    const text = draft.trim();
    setDraft("");
    if (!text || full || values.includes(text)) return;
    onChange([...values, text]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-md bg-hover py-0.5 pl-2 pr-1 text-xs text-ink ring-1 ring-hairline"
            >
              <span className="break-all">{item}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((other) => other !== item))}
                className="rounded p-0.5 text-subtle hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                aria-label={`Quitar ${item}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        type={numeric ? "number" : "text"}
        min={numeric ? 0 : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          commit();
          onBlur();
        }}
        disabled={full}
        placeholder={full ? `Máximo ${SEGMENT_MAX_LIST_VALUES} valores` : "Escribe un valor y pulsa Enter"}
        aria-label={label}
        aria-invalid={invalid}
      />
    </div>
  );
}
