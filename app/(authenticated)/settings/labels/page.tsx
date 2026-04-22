"use client";

import React, { useState } from "react";
import { Button, Collapse, Popconfirm, Space, Spin, Typography } from "antd";
import { EditOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { useLabels, useArchiveLabel } from "@/lib/hooks/labels";
import { LabelChip, LabelFormModal } from "@/components/app/labels";
import type { Label } from "@/lib/entity/label";

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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Etiquetas</Typography.Title>
          <Text type="secondary">Administra las etiquetas para categorizar citas</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewLabel}>
          Nueva etiqueta
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.length === 0 && (
              <Text type="secondary">No hay etiquetas activas.</Text>
            )}
            {active.map((label) => (
              <LabelRow key={label.id} label={label} onEdit={handleEdit} onRefetch={refetch} />
            ))}
          </div>

          {archived.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Collapse
                ghost
                items={[
                  {
                    key: "archived",
                    label: `Archivadas (${archived.length})`,
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {archived.map((label) => (
                          <LabelRow key={label.id} label={label} onEdit={handleEdit} onRefetch={refetch} isArchived />
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
    </div>
  );
}

// ── LabelRow ────────────────────────────────────────────────────────────────

function LabelRow({
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        background: isArchived ? "#fafafa" : "#fff",
        opacity: isArchived ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LabelChip label={label} size="sm" />
        {label.description && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {label.description}
          </Text>
        )}
      </div>
      {!isArchived && (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(label)}
          />
          <Popconfirm
            title="¿Archivar esta etiqueta?"
            description="La etiqueta dejará de estar disponible para nuevas citas."
            onConfirm={() => archiveLabel(onRefetch)}
            okText="Archivar"
            cancelText="Cancelar"
          >
            <Button
              type="text"
              size="small"
              icon={<InboxOutlined />}
              loading={loading}
              danger
            />
          </Popconfirm>
        </Space>
      )}
    </div>
  );
}
