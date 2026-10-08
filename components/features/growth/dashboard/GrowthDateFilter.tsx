"use client";

import { useCallback, useState } from "react";
import { Select } from "@/components/ui/controls/select";
import { DateRangePicker } from "@/components/ui/controls/date-range-picker";
import { localTodayInput } from "@/lib/datetime";
import type { SelectOption } from "@/components/ui/controls/select";

export interface DateFilterValue {
  from: string;
  to: string;
}

interface GrowthDateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

type Preset = "7d" | "30d" | "90d" | "custom";

const PRESET_OPTIONS: SelectOption[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "custom", label: "Personalizado" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function detectPreset(from: string, to: string): Preset {
  const today = localTodayInput();
  if (to !== today) return "custom";
  if (from === daysAgo(7)) return "7d";
  if (from === daysAgo(30)) return "30d";
  if (from === daysAgo(90)) return "90d";
  return "custom";
}

export function getDefaultDateFilter(): DateFilterValue {
  return { from: daysAgo(90), to: localTodayInput() };
}

export function GrowthDateFilter({ value, onChange }: GrowthDateFilterProps) {
  const [preset, setPreset] = useState<Preset>(() =>
    detectPreset(value.from, value.to),
  );

  const isCustom = preset === "custom";

  const handlePresetChange = useCallback(
    (v: string) => {
      const p = v as Preset;
      setPreset(p);
      if (p === "custom") return;
      const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
      onChange({ from: daysAgo(days), to: localTodayInput() });
    },
    [onChange],
  );

  const handleCustomChange = useCallback(
    (range: { from: string; to: string }) => {
      onChange(range);
    },
    [onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-48">
        <Select
          value={preset}
          onChange={handlePresetChange}
          options={PRESET_OPTIONS}
          aria-label="Período"
        />
      </div>
      {isCustom && (
        <DateRangePicker
          from={value.from}
          to={value.to}
          onChange={handleCustomChange}
        />
      )}
    </div>
  );
}
