import { Button, Typography } from "antd";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { SlotItemProps } from "./types";

const { Text } = Typography;

/** Renders a single availability slot row. */
export function SlotItem({ slot, onSchedule }: SlotItemProps) {
  return (
    <li className="flex items-center justify-between border-b border-gray-100 px-0 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ClockCircleOutlined className="text-gray-400" />
          <Text className="font-medium">{slot.time || "--:--"}</Text>
        </div>
        <div className="mt-0.5 flex gap-1 text-xs text-gray-500">
          <span>{slot.doctorName || "Doctor seleccionado"}</span>
          <span>·</span>
          <span>{slot.interval} min</span>
        </div>
      </div>
      {onSchedule && (
        <Button
          type="link"
          icon={<CalendarOutlined />}
          onClick={() => onSchedule(slot)}
        >
          Agendar
        </Button>
      )}
    </li>
  );
}
