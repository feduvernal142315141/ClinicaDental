"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Card } from "@/components/ui/atomic/data-display/card";
import {
  Calendar,
  Users,
  Settings,
  LogOut,
  Stethoscope,
  UserCheck,
  ClipboardList,
  BookImage,
  FileText,
} from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentPath, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const getMenuItems = () => {
    switch (user?.roleName) {
      case "admin":
        return [
          { path: "/dashboard", label: "Dashboard", icon: ClipboardList },
          { path: "/patients", label: "Pacientes", icon: Users },
          { path: "/appointments", label: "Citas", icon: Calendar },
          { path: "/campaigns", label: "Campañas", icon: BookImage },
          { path: "/template-demo", label: "Templates", icon: FileText },
          { path: "/settings", label: "Configuración", icon: Settings },
        ];
      case "doctor":
        return [
          { path: "/dashboard", label: "Dashboard", icon: Stethoscope },
          { path: "/appointments", label: "Mis Citas", icon: Calendar },
          { path: "/patients", label: "Pacientes", icon: UserCheck },
        ];
      case "patient":
        return [
          { path: "/dashboard", label: "Dashboard", icon: UserCheck },
          { path: "/appointments", label: "Mis Citas", icon: Calendar },
          { path: "/history", label: "Historial", icon: ClipboardList },
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    console.log("User role:", user);
  }, [user]);

  const menuItems = getMenuItems();

  const isActiveRoute = (itemPath: string): boolean => {
    if (!currentPath) return false;
    if (itemPath === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(itemPath);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0
        transition-transform duration-300 ease-in-out lg:transition-none
        w-64 lg:w-64
      `}
      >
        <Card className="w-full h-full p-4 lg:rounded-lg rounded-none">
          <div className="flex flex-col h-full">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-lg font-semibold text-primary">
                Sistema Médico
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.roleName}
              </p>
            </div>

            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                return (
                  <Link key={item.path} href={item.path} onClick={onClose}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <Button
              variant="outline"
              className="w-full justify-start mt-4 bg-transparent"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
