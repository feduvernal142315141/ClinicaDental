"use client";

import { Switch, Row, Col, Space, Typography } from "antd";
import { WorkingHours } from "./WorkingHours";
import { BreakTime } from "./BreakTime";

const { Text } = Typography;

interface DayScheduleRowProps {
  /** Day key (e.g., "monday") */
  dayKey: string;
  /** Day label in Spanish (e.g., "Lunes") */
  dayLabel: string;
  /** Whether the day is enabled */
  enabled: boolean;
  /** Callback when switch is toggled */
  onToggle: (checked: boolean) => void;
}

/**
 * DayScheduleRow Component
 *
 * Single row for a day's schedule with enable switch and time pickers.
 * Displays working hours and optional break time.
 */
export function DayScheduleRow({
  dayKey,
  dayLabel,
  enabled,
  onToggle,
}: DayScheduleRowProps) {
  return (
    <Row
      gutter={[16, 8]}
      align="middle"
      className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
    >
      {/* Day Name + Enable Switch */}
      <Col xs={24} sm={6} md={4}>
        <Space>
          <Switch size="small" checked={enabled} onChange={onToggle} />
          <Text strong className="text-sm">
            {dayLabel}
          </Text>
        </Space>
      </Col>

      {/* Working Hours */}
      <Col xs={24} sm={18} md={10}>
        <WorkingHours dayKey={dayKey} enabled={enabled} />
      </Col>

      {/* Break Time (Optional) */}
      <Col xs={24} sm={24} md={10}>
        <BreakTime dayKey={dayKey} enabled={enabled} />
      </Col>
    </Row>
  );
}
