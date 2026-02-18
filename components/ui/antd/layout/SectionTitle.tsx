"use client";

import { Typography } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title } = Typography;

type ButtonVariant = "new" | "back" | "custom";

interface SectionTitleProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional action button */
  actionButton?: {
    label: string;
    onClick: () => void;
    /** Button variant: 'new' (+ icon), 'back' (← icon), or 'custom' (provide icon) */
    variant?: ButtonVariant;
    /** Custom icon (only used when variant is 'custom') */
    icon?: React.ReactNode;
    type?: "primary" | "default" | "dashed" | "link" | "text";
  };
}

/**
 * SectionTitle Component
 *
 * Displays a section title with optional subtitle and action button.
 * Uses Ant Design Typography and Button components.
 *
 * @example
 * ```tsx
 * // New action with + icon
 * <SectionTitle
 *   title="Gestión de Doctores"
 *   subtitle="Administre los doctores del sistema"
 *   actionButton={{
 *     label: "Nuevo Doctor",
 *     onClick: handleNew,
 *     variant: "new"
 *   }}
 * />
 *
 * // Back action with ← icon
 * <SectionTitle
 *   title="Editar Doctor"
 *   actionButton={{
 *     label: "Atrás",
 *     onClick: handleBack,
 *     variant: "back",
 *     type: "default"
 *   }}
 * />
 *
 * // Custom icon
 * <SectionTitle
 *   title="Settings"
 *   actionButton={{
 *     label: "Save",
 *     onClick: handleSave,
 *     variant: "custom",
 *     icon: <SaveOutlined />
 *   }}
 * />
 * ```
 */
export function SectionTitle({
  title,
  subtitle,
  actionButton,
}: SectionTitleProps) {
  // Determine icon based on variant
  const getButtonIcon = () => {
    if (!actionButton) return null;

    const variant = actionButton.variant || "new";

    if (variant === "new") return <PlusOutlined />;
    if (variant === "back") return <ArrowLeftOutlined />;
    if (variant === "custom") return actionButton.icon;

    return <PlusOutlined />; // fallback
  };

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex-1">
        <Title level={2} className="!mb-1">
          {title}
        </Title>
        {subtitle && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {actionButton && (
        <Button
          type={actionButton.type || "primary"}
          icon={getButtonIcon()}
          onClick={actionButton.onClick}
          size="large"
        >
          {actionButton.label}
        </Button>
      )}
    </div>
  );
}
