import { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

interface UserProfileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function UserProfileCard({
  children,
  className,
  onClick,
}: UserProfileCardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "px-4 py-3 mx-2 mb-2 bg-primary/10 rounded-lg flex items-center gap-3 w-62",
        onClick && "hover:bg-primary/15 transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
}
