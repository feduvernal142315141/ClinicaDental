"use client";

import React, { useMemo } from "react";
import { Select, Alert, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLabels } from "@/lib/hooks/labels";
import { LabelChip } from "./LabelChip";
import type { LabelSummary } from "@/lib/entity/label";

interface LabelSelectorProps {
  appointmentId?: string;
  value?: string[];
  onChange?: (ids: string[]) => void;
  maxLabels?: number;
  disabled?: boolean;
  onCreateNew?: () => void;
}

export function LabelSelector({
  value = [],
  onChange,
  maxLabels = 5,
  disabled = false,
  onCreateNew,
}: LabelSelectorProps) {
  const { labels, loading } = useLabels(false);

  const options = useMemo(
    () =>
      labels.map((label) => ({
        value: label.id,
        label: (
          <LabelChip
            label={label as LabelSummary}
            size="sm"
          />
        ),
        // For search filtering
        search: label.name.toLowerCase(),
      })),
    [labels],
  );

  const atLimit = value.length >= maxLabels;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Select
        mode="multiple"
        loading={loading}
        disabled={disabled}
        value={value}
        onChange={onChange}
        options={options}
        filterOption={(input, option) =>
          (option?.search as string ?? "").includes(input.toLowerCase())
        }
        placeholder="Seleccionar etiquetas..."
        maxCount={maxLabels}
        style={{ width: "100%" }}
        popupRender={(menu) => (
          <>
            {menu}
            {onCreateNew && (
              <div style={{ padding: "8px", borderTop: "1px solid var(--color-hairline)" }}>
                <Button type="link" icon={<PlusOutlined />} onClick={onCreateNew}>
                  Nueva etiqueta
                </Button>
              </div>
            )}
          </>
        )}
        tagRender={(props) => {
          const found = labels.find((l) => l.id === props.value);
          if (!found) return <span>{props.label}</span>;
          return (
            <span style={{ marginRight: 4 }}>
              <LabelChip
                label={found}
                size="xs"
                removable={!disabled}
                onRemove={props.onClose}
              />
            </span>
          );
        }}
      />
      {atLimit && (
        <Alert
          type="warning"
          title={`Límite de ${maxLabels} etiquetas por cita alcanzado`}
          banner
          style={{ padding: "2px 8px", fontSize: 12 }}
        />
      )}
    </div>
  );
}
