"use client";

import { Button, Avatar, Typography, Space, Checkbox, Divider } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { SchedulerDoctorOption } from "@/lib/entity/appointment";
import { LabelChip } from "@/components/app/labels";
import { useLabels } from "@/lib/hooks/labels";

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
  selectedLabelIds: Set<string>;
  onToggleLabel: (labelId: string) => void;
  onClearLabels: () => void;
}

function LabelFilterSection({
  selectedLabelIds,
  onToggle,
  onClear,
}: {
  selectedLabelIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const { labels, loading } = useLabels(false);
  const activeLabels = labels.filter((l) => !l.isArchived);

  if (loading || activeLabels.length === 0) return null;

  return (
    <>
      <Divider style={{ margin: "12px 0" }} />
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#8c8c8c",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Etiquetas
          </Text>
          {selectedLabelIds.size > 0 && (
            <Button
              size="small"
              type="link"
              onClick={onClear}
              style={{ padding: 0, fontSize: 11 }}
            >
              Limpiar
            </Button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {activeLabels.map((label) => {
            const isSelected = selectedLabelIds.has(label.id);
            return (
              <span
                key={label.id}
                role="button"
                tabIndex={0}
                onClick={() => onToggle(label.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle(label.id);
                  }
                }}
                style={{
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.45,
                  transition: "opacity 0.15s",
                }}
              >
                <LabelChip label={label} size="sm" />
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
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
  selectedLabelIds,
  onToggleLabel,
  onClearLabels,
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

      {/* Labels filter */}
      <LabelFilterSection
        selectedLabelIds={selectedLabelIds}
        onToggle={onToggleLabel}
        onClear={onClearLabels}
      />
    </div>
  );
}
