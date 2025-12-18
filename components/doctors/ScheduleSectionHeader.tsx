"use client";

import { Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface ScheduleSectionHeaderProps {
  /** Main title */
  title?: string;
  /** Subtitle/description */
  description?: string;
}

/**
 * ScheduleSectionHeader Component
 *
 * Header with icon, title, and description for the schedule section.
 */
export function ScheduleSectionHeader({
  title = "Horarios de Atención",
  description = "Configure los días y horarios de atención del doctor",
}: ScheduleSectionHeaderProps) {
  return (
    <div className="mb-4">
      <Text strong className="flex items-center gap-2">
        <ClockCircleOutlined /> {title}
      </Text>
      <Text type="secondary" className="text-xs block">
        {description}
      </Text>
    </div>
  );
}
