"use client";

import { Layout, Typography, Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { MenuOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import { ThemeSwitch } from "@/components/ui/antd/feedback/ThemeSwitch";

const { Header } = Layout;
const { Text } = Typography;

interface MobileHeaderAntdProps {
  onToggleSidebar: () => void;
  userName?: string;
  userRole?: string;
}

/**
 * Ant Design Mobile Header component
 * Compact header for mobile devices with menu toggle
 */
export function MobileHeaderAntd({
  onToggleSidebar,
  userName,
  userRole,
}: MobileHeaderAntdProps) {
  return (
    <Header
      className="lg:hidden flex items-center justify-between"
      style={{
        background: "var(--background, #fff)",
        borderBottom: "1px solid var(--border, #f0f0f0)",
        height: 56,
        padding: "0 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left - Menu button and logo */}
      <Space align="center">
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: 18 }} />}
          onClick={onToggleSidebar}
        />
        <div className="flex items-center gap-2">
          <MedicineBoxOutlined style={{ fontSize: 20, color: "#1677ff" }} />
          <Text strong className="text-base">
            Sistema Médico
          </Text>
        </div>
        <ThemeSwitch />
      </Space>

      {/* Right - User info */}
      {userName && (
        <div className="text-right">
          <Text strong className="text-sm block">
            {userName}
          </Text>
          {userRole && (
            <Text type="secondary" className="text-xs capitalize">
              {userRole}
            </Text>
          )}
        </div>
      )}
    </Header>
  );
}
