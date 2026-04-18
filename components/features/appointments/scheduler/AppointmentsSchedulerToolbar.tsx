"use client";

import { Button, DatePicker, Segmented, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type {
  SchedulerViewMode,
  SchedulerDateRange,
} from "@/lib/entity/appointment";

dayjs.locale("es");

const { Text } = Typography;

const VIEW_OPTIONS: { label: string; value: SchedulerViewMode }[] = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
];

interface AppointmentsSchedulerToolbarProps {
  viewMode: SchedulerViewMode;
  onViewModeChange: (mode: SchedulerViewMode) => void;
  currentDate: string;
  dateRange: SchedulerDateRange;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (date: string) => void;
}

function formatRangeLabel(
  viewMode: SchedulerViewMode,
  currentDate: string,
  dateRange: SchedulerDateRange,
): string {
  const ref = dayjs(currentDate);

  switch (viewMode) {
    case "day":
      return ref.format("dddd, D [de] MMMM [de] YYYY");
    case "week": {
      const start = dayjs(dateRange.start);
      const end = dayjs(dateRange.end);
      if (start.month() === end.month()) {
        return `${start.format("D")} – ${end.format("D [de] MMMM [de] YYYY")}`;
      }
      if (start.year() === end.year()) {
        return `${start.format("D [de] MMM")} – ${end.format("D [de] MMM [de] YYYY")}`;
      }
      return `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
    }
    case "month":
      return ref.format("MMMM [de] YYYY");
  }
}

export function AppointmentsSchedulerToolbar({
  viewMode,
  onViewModeChange,
  currentDate,
  dateRange,
  onPrev,
  onNext,
  onToday,
  onDateChange,
}: AppointmentsSchedulerToolbarProps) {
  const rangeLabel = formatRangeLabel(viewMode, currentDate, dateRange);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Left: view mode */}
        <Segmented
          options={VIEW_OPTIONS}
          value={viewMode}
          onChange={(val) => onViewModeChange(val as SchedulerViewMode)}
        />

        {/* Center: navigation */}
        <Space size={4}>
          <Button icon={<LeftOutlined />} size="small" onClick={onPrev} />
          <Button size="small" onClick={onToday}>
            Hoy
          </Button>
          <Button icon={<RightOutlined />} size="small" onClick={onNext} />
        </Space>

        {/* Range label */}
        <Text
          strong
          style={{
            fontSize: 15,
            textTransform: "capitalize",
            whiteSpace: "nowrap",
          }}
        >
          {rangeLabel}
        </Text>

        {/* Date picker */}
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          value={dayjs(currentDate, "YYYY-MM-DD")}
          onChange={(val) => {
            if (val) onDateChange(val.format("YYYY-MM-DD"));
          }}
          allowClear={false}
          style={{ marginLeft: "auto" }}
        />
      </div>
    </div>
  );
}
