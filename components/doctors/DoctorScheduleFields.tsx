"use client";

import { Form, Switch, TimePicker, Row, Col, Space, Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { DAYS_OF_WEEK, DEFAULT_WEEK_SCHEDULE } from "@/lib/entity/schedule";

const { Text } = Typography;

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
      <div className="mb-4">
        <Text strong className="flex items-center gap-2">
          <ClockCircleOutlined /> Horarios de Atención
        </Text>
        <Text type="secondary" className="text-xs">
          Configure los días y horarios de atención del doctor
        </Text>
      </div>

      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue, setFieldValue }) => (
          <Space direction="vertical" size="small" className="w-full">
            {DAYS_OF_WEEK.map((day) => {
              const enabled = getFieldValue(["schedule", day.key, "enabled"]);

              return (
                <Row
                  key={day.key}
                  gutter={[16, 8]}
                  align="middle"
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  {/* Day Name + Enable Switch */}
                  <Col xs={24} sm={6} md={4}>
                    <Space>
                      <Switch
                        size="small"
                        checked={enabled}
                        onChange={(checked) => {
                          setFieldValue(
                            ["schedule", day.key, "enabled"],
                            checked
                          );
                        }}
                      />
                      <Text strong className="text-sm">
                        {day.label}
                      </Text>
                    </Space>
                  </Col>

                  {/* Working Hours */}
                  <Col xs={24} sm={18} md={10}>
                    {enabled ? (
                      <Space size="small" className="w-full">
                        <Text type="secondary" className="text-xs">
                          De:
                        </Text>
                        <Form.Item
                          name={["schedule", day.key, "startTime"]}
                          noStyle
                          getValueFromEvent={(time: Dayjs | null) =>
                            time ? time.format("HH:mm") : ""
                          }
                          getValueProps={(value: string) => ({
                            value: value ? dayjs(value, "HH:mm") : null,
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
                          name={["schedule", day.key, "endTime"]}
                          noStyle
                          getValueFromEvent={(time: Dayjs | null) =>
                            time ? time.format("HH:mm") : ""
                          }
                          getValueProps={(value: string) => ({
                            value: value ? dayjs(value, "HH:mm") : null,
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
                    ) : (
                      <Text type="secondary" className="text-xs">
                        No disponible
                      </Text>
                    )}
                  </Col>

                  {/* Break Time (Optional) */}
                  <Col xs={24} sm={24} md={10}>
                    {enabled ? (
                      <Space size="small" className="w-full">
                        <Text type="secondary" className="text-xs">
                          Descanso:
                        </Text>
                        <Form.Item
                          name={["schedule", day.key, "breakStart"]}
                          noStyle
                          getValueFromEvent={(time: Dayjs | null) =>
                            time ? time.format("HH:mm") : ""
                          }
                          getValueProps={(value: string) => ({
                            value: value ? dayjs(value, "HH:mm") : null,
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
                          name={["schedule", day.key, "breakEnd"]}
                          noStyle
                          getValueFromEvent={(time: Dayjs | null) =>
                            time ? time.format("HH:mm") : ""
                          }
                          getValueProps={(value: string) => ({
                            value: value ? dayjs(value, "HH:mm") : null,
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
                    ) : null}
                  </Col>
                </Row>
              );
            })}
          </Space>
        )}
      </Form.Item>
    </Col>
  );
}
