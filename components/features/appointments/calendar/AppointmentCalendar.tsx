"use client";

import { useCallback } from "react";
import { Badge, Button, Calendar, Spin, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Card } from "@/components/ui/antd";
import { useAppointmentCalendar } from "@/lib/hooks/appointments/use-appointment-calendar";
import type { AvailabilitySlot } from "@/lib/entity/appointment";

dayjs.locale("es");

const { Text } = Typography;

interface AppointmentCalendarProps {
  /** Availability slots to display on the calendar */
  slots: AvailabilitySlot[];
  /** Whether the data is loading */
  loading?: boolean;
  /** Selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Callback when calendar date changes */
  onDateChange: (date: string) => void;
  /** Callback when user schedules a slot */
  onScheduleSlot?: (slot: AvailabilitySlot) => void;
}

/**
 * Calendar view for doctor availability slots.
 */
export function AppointmentCalendar({
  slots,
  loading = false,
  selectedDate,
  onDateChange,
  onScheduleSlot,
}: AppointmentCalendarProps) {
  const {
    selectedDate: selectedDateValue,
    slotsByDate,
    selectedDateSlots,
    onSelectDate,
    onPanelChange,
  } = useAppointmentCalendar({
    slots,
    selectedDate,
    onDateChange,
  });

  const dateCellRender = useCallback(
    (date: Dayjs) => {
      const dateStr = date.format("YYYY-MM-DD");
      const daySlots = slotsByDate.get(dateStr);
      if (!daySlots?.length) return null;

      return (
        <Badge
          status="processing"
          text={<Text className="text-xs!">{daySlots.length} disponibles</Text>}
        />
      );
    },
    [slotsByDate],
  );

  const cellRender = useCallback(
    (current: Dayjs, info: { type: string }) => {
      if (info.type === "date") return dateCellRender(current);
      return null;
    },
    [dateCellRender],
  );

  return (
    <Card
      title="Calendario de Disponibilidad"
      styles={{
        body: { padding: 0 },
      }}
    >
      <Spin spinning={loading}>
        <Calendar
          fullscreen={false}
          value={selectedDateValue}
          onSelect={onSelectDate}
          onPanelChange={onPanelChange}
          cellRender={cellRender}
        />
      </Spin>

      <div className="border-t px-4 py-3">
        <Text strong className="mb-2 block">
          {selectedDateValue.format("dddd, D [de] MMMM YYYY")}
        </Text>

        {selectedDateSlots.length === 0 ? (
          <Text type="secondary" className="block py-2 text-center text-sm">
            No hay horarios disponibles para este día
          </Text>
        ) : (
          <ul className="m-0 max-h-60 list-none overflow-y-auto p-0">
            {selectedDateSlots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between border-b border-gray-100 px-0 py-2 last:border-b-0"
              >
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
                {onScheduleSlot && (
                  <Button
                    type="link"
                    icon={<CalendarOutlined />}
                    onClick={() => onScheduleSlot(slot)}
                  >
                    Agendar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
