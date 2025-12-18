"use client";

import { Form, TimePicker, Space, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

interface BreakTimeProps {
  /** Day key (e.g., "monday") */
  dayKey: string;
  /** Whether the day is enabled */
  enabled: boolean;
}

/**
 * BreakTime Component
 *
 * Time pickers for optional break time during working hours.
 * Shows only when day is enabled.
 *
 * Note: Default values are set in the Form's initialValues prop
 * (DEFAULT_WEEK_SCHEDULE), not via Form.Item initialValue to avoid
 * conflicts with form state.
 */
export function BreakTime({ dayKey, enabled }: BreakTimeProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Space size="small" className="w-full">
      <Text type="secondary" className="text-xs">
        Descanso:
      </Text>
      <Form.Item
        name={["schedule", dayKey, "breakStart"]}
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
        name={["schedule", dayKey, "breakEnd"]}
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
