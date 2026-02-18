"use client";

import { Card, Progress, Typography, Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";

const { Text } = Typography;

interface StorageCardProps {
  usedPercentage: number;
  onDismiss?: () => void;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Ant Design Storage Notification Card
 * Shows storage usage with progress and action buttons
 */
export function StorageCard({
  usedPercentage,
  onDismiss,
  onUpgrade,
  className,
}: StorageCardProps) {
  const getStrokeColor = () => {
    if (usedPercentage >= 90) return "#ff4d4f";
    if (usedPercentage >= 70) return "#faad14";
    return "#1677ff";
  };

  return (
    <Card
      size="small"
      className={`${className || ""}`}
      styles={{
        body: { padding: 16 },
      }}
    >
      <Space direction="vertical" size="small" className="w-full">
        <div className="flex items-center gap-3">
          <Progress
            type="circle"
            percent={usedPercentage}
            size={50}
            strokeColor={getStrokeColor()}
            format={(percent) => (
              <Text strong style={{ fontSize: 12 }}>
                {percent}%
              </Text>
            )}
          />
          <div className="flex-1">
            <Text strong className="text-sm block">
              Used space
            </Text>
            <Text type="secondary" className="text-xs">
              Your team has used {usedPercentage}% of available space
            </Text>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onDismiss && (
            <Button size="small" type="text" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
          {onUpgrade && (
            <Button size="small" type="link" onClick={onUpgrade}>
              Upgrade plan
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
}
