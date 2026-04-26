"use client";

import { Layout, Space, Badge, Tooltip } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { BellOutlined } from "@ant-design/icons";
import { ThemeSwitch } from "@/components/ui/antd/feedback/ThemeSwitch";
import { UserDropdown } from "@/components/ui/antd/navigation/UserDropdown";
import { AppBreadcrumb } from "@/components/ui/antd/navigation/AppBreadcrumb";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Stethoscope } from "lucide-react";

const { Header } = Layout;

interface AppHeaderAntdProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onChangePassword?: () => void;
  onSupport?: () => void;
  onNotificationsClick?: () => void;
  showCollapseButton?: boolean;
  notificationCount?: number;
}

/**
 * Ant Design App Header component
 * Contains search, notifications, theme toggle, and user dropdown
 */
export function AppHeaderAntd({
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onChangePassword,
  onSupport,
  onNotificationsClick,
  notificationCount = 0,
}: AppHeaderAntdProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { appointmentId, patientId, patientName } = useActiveConsultation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasActiveConsultation = mounted && appointmentId && patientId;
  const isCurrentlyOnConsultation = 
    pathname === `/patients/${patientId}` && 
    searchParams.get("tab") === "workspace" && 
    searchParams.get("appointmentId") === appointmentId;
    
  const shouldShowIcon = hasActiveConsultation && !isCurrentlyOnConsultation;

  const handleReturnToConsultation = () => {
    if (hasActiveConsultation) {
      router.push(`/patients/${patientId}?tab=workspace&appointmentId=${appointmentId}`);
    }
  };

  return (
    <Header
      className="flex items-center justify-between px-4 lg:px-6 rounded-tl-4xl"
      style={{
        background: "var(--background, #fff)",
        borderBottom: "1px solid var(--border, #f0f0f0)",
        height: 64,
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left section - Breadcrumb */}
      <div className="flex items-center gap-4">
        <AppBreadcrumb />
      </div>

      {/* Right section */}
      <Space size="middle" align="center">
        {shouldShowIcon && (
          <Tooltip title={`Volver a consulta: ${patientName}`}>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              onClick={handleReturnToConsultation}
            >
              <Stethoscope className="h-5 w-5" />
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Button>
          </Tooltip>
        )}
        <Badge count={notificationCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={onNotificationsClick}
          />
        </Badge>
        <ThemeSwitch />
        <UserDropdown
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onLogout={onLogout}
          onProfile={onProfile}
          onChangePassword={onChangePassword}
          onSupport={onSupport}
        />
      </Space>
    </Header>
  );
}
