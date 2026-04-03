"use client";

import { Button, Avatar, Typography, Space, Checkbox } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { SchedulerDoctorOption } from "@/lib/entity/appointment";

const { Text } = Typography;

interface AppointmentsSpecialistSidebarProps {
  doctors: SchedulerDoctorOption[];
  visibleDoctorIds: Set<string>;
  onToggleDoctor: (doctorId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onNewAppointment: () => void;
  canCreate: boolean;
  loading?: boolean;
}

export function AppointmentsSpecialistSidebar({
  doctors,
  visibleDoctorIds,
  onToggleDoctor,
  onSelectAll,
  onClearAll,
  onNewAppointment,
  canCreate,
  loading,
}: AppointmentsSpecialistSidebarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      {/* CTA */}
      {canCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          size="large"
          onClick={onNewAppointment}
        >
          Nueva cita
        </Button>
      )}

      {/* Bulk actions */}
      <Space size={4}>
        <Button size="small" type="link" onClick={onSelectAll}>
          Ver todos
        </Button>
        <Button size="small" type="link" onClick={onClearAll}>
          Limpiar
        </Button>
      </Space>

      {/* Doctor list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {loading &&
          doctors.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderRadius: 8,
                background: "#f5f5f5",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}

        {doctors.map((doctor) => {
          const checked = visibleDoctorIds.has(doctor.id);
          return (
            <div
              key={doctor.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleDoctor(doctor.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleDoctor(doctor.id);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
                background: checked ? `${doctor.color}0A` : "transparent",
                transition: "background 0.15s",
                opacity: checked ? 1 : 0.5,
              }}
            >
              <Checkbox checked={checked} tabIndex={-1} />
              <Avatar
                size={28}
                style={{
                  backgroundColor: doctor.color,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {doctor.name.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text
                  strong
                  ellipsis
                  style={{ display: "block", fontSize: 13, lineHeight: 1.3 }}
                >
                  {doctor.name}
                </Text>
                {doctor.specialty && (
                  <Text
                    type="secondary"
                    ellipsis
                    style={{ display: "block", fontSize: 11, lineHeight: 1.2 }}
                  >
                    {doctor.specialty}
                  </Text>
                )}
              </div>
            </div>
          );
        })}

        {!loading && doctors.length === 0 && (
          <Text type="secondary" style={{ textAlign: "center", marginTop: 24 }}>
            No hay especialistas registrados
          </Text>
        )}
      </div>
    </div>
  );
}
