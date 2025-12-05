import { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

interface NotificationCardProps {
  children: ReactNode;
  variant?: "info" | "warning" | "success" | "error";
  className?: string;
}

const variantClasses = {
  info: "bg-primary/20",
  warning: "bg-yellow-500/20",
  success: "bg-green-500/20",
  error: "bg-red-500/20",
};

export function NotificationCard({
  children,
  variant = "info",
  className,
}: NotificationCardProps) {
  return (
    <div
      className={cn(
        "mx-4 mb-4 p-4 rounded-xl",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
