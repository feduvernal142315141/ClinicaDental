import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { BrandMark } from "./brand-mark";

interface LogoIconProps {
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LogoIcon({
  icon: Icon,
  size = "md",
  className,
}: LogoIconProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-primary flex items-center justify-center shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn("text-primary-foreground", iconSizeClasses[size])}
        />
      ) : (
        <BrandMark
          variant="mono"
          className={cn("text-primary-foreground", iconSizeClasses[size])}
        />
      )}
    </div>
  );
}
