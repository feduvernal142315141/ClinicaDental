"use client";

import { Form, TimePicker, Space, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

interface WorkingHoursProps {
  /** Day key (e.g., "monday") */
  dayKey: string;
  /** Whether the day is enabled */
  enabled: boolean;
}

/**
 * WorkingHours Component
 *
 * Time pickers for daily working hours (start and end time).
 * Shows only when day is enabled.
 */
export function WorkingHours({ dayKey, enabled }: WorkingHoursProps) {
  if (!enabled) {
    return (
      <Text type="secondary" className="text-xs">
        No disponible
      </Text>
    );
  }

  return (
    <Space size="small" className="w-full">
      <Text type="secondary" className="text-xs">
        De:
      </Text>
      <Form.Item
        name={["schedule", dayKey, "startTime"]}
        noStyle
        getValueFromEvent={(time: Dayjs | null) =>
          time ? time.format("HH:mm") : undefined
        }
        getValueProps={(value: string) => ({
          value: value && value !== "" ? dayjs(value, "HH:mm") : undefined,
        })}
      >
        <TimePicker
          format="HH:mm"
          size="small"
          placeholder="Inicio"
          className="w-24"
        />
      </Form.Item>

      <Text type="secondary" className="text-xs">
        a:
      </Text>
      <Form.Item
        name={["schedule", dayKey, "endTime"]}
        noStyle
        getValueFromEvent={(time: Dayjs | null) =>
          time ? time.format("HH:mm") : undefined
        }
        getValueProps={(value: string) => ({
          value: value && value !== "" ? dayjs(value, "HH:mm") : undefined,
        })}
      >
        <TimePicker
          format="HH:mm"
          size="small"
          placeholder="Fin"
          className="w-24"
        />
      </Form.Item>
    </Space>
  );
}
