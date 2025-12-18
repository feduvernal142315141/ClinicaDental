"use client";

import { Form, Col, Space } from "antd";
import { DAYS_OF_WEEK } from "@/lib/entity/schedule";
import { DayScheduleRow } from "./DayScheduleRow";
import { ScheduleSectionHeader } from "./ScheduleSectionHeader";

/**
 * DoctorScheduleFields Component
 *
 * Form fields for managing doctor's weekly schedule.
 * Each day can be enabled/disabled with start/end times and optional break times.
 *
 * @example
 * <Form initialValues={{ schedule: DEFAULT_WEEK_SCHEDULE }}>
 *   <DoctorScheduleFields />
 * </Form>
 */
export function DoctorScheduleFields() {
  return (
    <Col span={24}>
      <ScheduleSectionHeader />

      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue, setFieldValue }) => (
          <Space orientation="vertical" size="small" className="w-full">
            {DAYS_OF_WEEK.map((day) => {
              const enabled = getFieldValue(["schedule", day.key, "enabled"]);

              return (
                <DayScheduleRow
                  key={day.key}
                  dayKey={day.key}
                  dayLabel={day.label}
                  enabled={enabled}
                  onToggle={(checked) => {
                    setFieldValue(["schedule", day.key, "enabled"], checked);
                  }}
                />
              );
            })}
          </Space>
        )}
      </Form.Item>
    </Col>
  );
}
