"use client";

import React, { useState } from "react";
import { Collapse, Popconfirm, Spin, Tooltip, Typography, Card } from "antd";
import { EditOutlined, InboxOutlined } from "@ant-design/icons";
import { useLabels, useArchiveLabel } from "@/lib/hooks/labels";
import { LabelChip, LabelFormModal } from "@/components/app/labels";
import type { Label } from "@/lib/entity/label";
import { SectionTitle } from "@/components/ui/antd";
import { Button } from "@/components/ui/primitives/shadcn/button"; // From shadcn/button or AntD if needed, but the original code used Antd Button inside the layout. Oh wait, original code used Antd Button. Let's stick to antd Button for the Card actions. 
// Ah, the original code used `import { Button } from "antd";` Let's use `import { Button as AntdButton } from "antd";` or just standard Antd `Button`.

const { Text } = Typography;

export default function LabelsSettingsPage() {
  const { labels, loading, refetch } = useLabels(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>(undefined);

  const active = labels.filter((l) => !l.isArchived);
  const archived = labels.filter((l) => l.isArchived);

  const handleNewLabel = () => {
    setEditingLabel(undefined);
    setModalOpen(true);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    refetch();
  };

  return (
    <>
      <SectionTitle
        title="Etiquetas"
        subtitle="Administra las etiquetas para categorizar citas"
        actionButton={{
          label: "Nueva etiqueta",
          onClick: handleNewLabel,
          variant: "new"
        }}
      />

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {active.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <Text type="secondary" className="text-lg">No hay etiquetas activas.</Text>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "24px",
            }}>
              {active.map((label) => (
                <LabelCard key={label.id} label={label} onEdit={handleEdit} onRefetch={refetch} />
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <Collapse
                ghost
                items={[
                  {
                    key: "archived",
                    label: <Text strong className="text-gray-500">Archivadas ({archived.length})</Text>,
                    children: (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "24px",
                      }}>
                        {archived.map((label) => (
                          <LabelCard key={label.id} label={label} onEdit={handleEdit} onRefetch={refetch} isArchived />
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </>
      )}

      <LabelFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        label={editingLabel}
      />
    </>
  );
}

// ── LabelCard ───────────────────────────────────────────────────────────────

import { Button as AntdButton } from "antd";

function LabelCard({
  label,
  onEdit,
  onRefetch,
  isArchived = false,
}: {
  label: Label;
  onEdit: (l: Label) => void;
  onRefetch: () => void;
  isArchived?: boolean;
}) {
  const { archiveLabel, loading } = useArchiveLabel(label.id);

  return (
    <Card
      size="small"
      hoverable={!isArchived}
      style={{
        borderColor: isArchived ? "#e5e7eb" : `${label.color}40`,
        backgroundColor: isArchived ? "#f9fafb" : "#ffffff",
        opacity: isArchived ? 0.75 : 1,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease-in-out",
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
      styles={{ body: { padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start" } }}
      actions={
        isArchived
          ? undefined
          : [
              <Tooltip title="Editar" key="edit">
                <AntdButton
                  type="text"
                  icon={<EditOutlined style={{ fontSize: '18px' }} />}
                  onClick={() => onEdit(label)}
                  style={{ color: "#3B82F6", width: "100%", height: "auto", padding: "8px 0" }}
                />
              </Tooltip>,
              <Popconfirm
                key="archive"
                title="¿Archivar esta etiqueta?"
                description="Dejará de estar disponible para nuevas citas."
                onConfirm={() => archiveLabel(onRefetch)}
                okText="Archivar"
                okButtonProps={{ danger: true, loading }}
                cancelText="Cancelar"
              >
                <Tooltip title="Archivar">
                  <AntdButton
                    type="text"
                    icon={<InboxOutlined style={{ fontSize: '18px' }} />}
                    danger
                    style={{ width: "100%", height: "auto", padding: "8px 0" }}
                  />
                </Tooltip>
              </Popconfirm>,
            ]
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <LabelChip label={label} size="md" />
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 13, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
            {label.description || "Sin descripción"}
          </Text>
        </div>
      </div>
    </Card>
  );
}
