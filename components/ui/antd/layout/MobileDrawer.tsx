"use client";

import { Drawer, Typography, Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { CloseOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import { NavMenu, MenuItem } from "@/components/ui/antd/navigation/NavMenu";
import { UserDropdown } from "@/components/ui/antd/navigation/UserDropdown";
import { ThemeSwitch } from "@/components/ui/antd/feedback/ThemeSwitch";

const { Text } = Typography;

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  currentPath: string;
  mainMenuItems: MenuItem[];
  secondaryMenuItems?: MenuItem[];
  onNavigate: (path: string) => void;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onSupport?: () => void;
}

/**
 * Ant Design Mobile Drawer component
 * Slide-out navigation for mobile devices
 */
export function MobileDrawer({
  open,
  onClose,
  currentPath,
  mainMenuItems,
  secondaryMenuItems = [],
  onNavigate,
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onSupport,
}: MobileDrawerProps) {
  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <Drawer
      placement="left"
      open={open}
      onClose={onClose}
      width={280}
      closeIcon={null}
      styles={{
        header: { display: "none" },
        body: { padding: 0 },
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <MedicineBoxOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            <Text strong className="text-base">
              Sistema Médico
            </Text>
          </div>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <NavMenu
            items={mainMenuItems}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            collapsed={false}
          />

          {secondaryMenuItems.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <NavMenu
                items={secondaryMenuItems}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                collapsed={false}
              />
            </div>
          )}
        </nav>

        {/* Footer with user and theme */}
        <div className="border-t p-4">
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Tema
              </Text>
              <ThemeSwitch />
            </div>
            <UserDropdown
              userName={userName}
              userEmail={userEmail}
              userAvatar={userAvatar}
              onLogout={onLogout}
              onProfile={onProfile}
              onSupport={onSupport}
            />
          </Space>
        </div>
      </div>
    </Drawer>
  );
}
