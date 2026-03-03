"use client";

import { useCallback } from "react";
import { Badge, Calendar, Spin, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CellRenderInfo } from "@rc-component/picker/interface";
import { Card } from "@/components/ui/antd";
import { useAppointmentCalendar } from "@/lib/hooks/appointments/use-appointment-calendar";
import { SlotItem } from "./SlotItem";
import type { AppointmentCalendarProps } from "./types";

dayjs.locale("es");

const { Text } = Typography;

/**
 * Calendar view for doctor availability slots.
 */
export function AppointmentCalendar({
  slots,
  loading = false,
  selectedDate,
  onDateChange,
  onScheduleSlot,
  disabledDate,
}: AppointmentCalendarProps) {
  const {
    selectedDate: currentDate,
    slotsByDate,
    selectedDateSlots,
    onSelectDate,
    onPanelChange,
  } = useAppointmentCalendar({
    slots,
    selectedDate,
    onDateChange,
  });

  const cellRender = useCallback(
    (current: Dayjs, info: CellRenderInfo<Dayjs>) => {
      if (info.type !== "date") return null;

      const daySlots = slotsByDate.get(current.format("YYYY-MM-DD"));
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
          value={currentDate}
          onSelect={onSelectDate}
          onPanelChange={onPanelChange}
          cellRender={cellRender}
          disabledDate={disabledDate}
        />
      </Spin>

      <div className="border-t px-4 py-3">
        <Text strong className="mb-2 block">
          {currentDate.format("dddd, D [de] MMMM YYYY")}
        </Text>

        {selectedDateSlots.length === 0 ? (
          <Text type="secondary" className="block py-2 text-center text-sm">
            No hay horarios disponibles para este día
          </Text>
        ) : (
          <ul className="m-0 max-h-60 list-none overflow-y-auto p-0">
            {selectedDateSlots.map((slot) => (
              <SlotItem key={slot.id} slot={slot} onSchedule={onScheduleSlot} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
