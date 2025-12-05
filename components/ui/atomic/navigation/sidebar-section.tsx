import { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  separator?: boolean;
  className?: string;
}

export function SidebarSection({
  title,
  children,
  separator = false,
  className,
}: SidebarSectionProps) {
  return (
    <div className={cn("py-2", separator && "mt-4 pt-4", className)}>
      {title && (
        <h3 className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
