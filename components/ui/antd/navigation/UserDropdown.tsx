"use client";

import { Dropdown, Avatar, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  KeyOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  DownOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface UserDropdownProps {
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onChangePassword?: () => void;
  onSupport?: () => void;
  collapsed?: boolean;
}

/**
 * Ant Design User Dropdown component
 * Shows user info with profile, settings, support, and logout options
 */
export function UserDropdown({
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onChangePassword,
  onSupport,
  collapsed = false,
}: UserDropdownProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "header",
      type: "group",
      label: "Cuenta",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Mi Perfil",
      onClick: onProfile,
    },
    ...(onChangePassword
      ? [
          {
            key: "change-password",
            icon: <KeyOutlined />,
            label: "Cambiar contraseña",
            onClick: onChangePassword,
          },
        ]
      : []),
    ...(onSupport
      ? [
          {
            key: "support",
            icon: <QuestionCircleOutlined />,
            label: "Soporte",
            onClick: onSupport,
          },
        ]
      : []),
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Cerrar sesión",
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="topRight"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer 
                   hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <Avatar
          size={collapsed ? "default" : "small"}
          src={userAvatar}
          icon={!userAvatar && <UserOutlined />}
          style={{ backgroundColor: "#1677ff" }}
        >
          {!userAvatar && getInitials(userName)}
        </Avatar>
        {!collapsed && (
          <>
            <div className="flex flex-col min-w-0">
              <Text strong className="text-sm leading-tight truncate">
                {userName}
              </Text>
              <Text type="secondary" className="text-xs truncate">
                {userEmail}
              </Text>
            </div>
            <DownOutlined className="text-xs text-gray-400 ml-auto" />
          </>
        )}
      </div>
    </Dropdown>
  );
}
