import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: "default" | "ghost" | "primary";
  size?: "sm" | "md" | "lg";
  title?: string;
  className?: string;
}

const variantClasses = {
  default: "hover:bg-accent",
  ghost: "hover:bg-accent/50",
  primary: "hover:bg-primary/20",
};

const sizeClasses = {
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function IconButton({
  icon: Icon,
  onClick,
  variant = "default",
  size = "md",
  title,
  className,
}: IconButtonProps) {
  const antdType = variant === "primary" ? "primary" : "text";
  const antdSize = size === "sm" ? "small" : size === "lg" ? "large" : "middle";

  return (
    <Button
      type={antdType}
      size={antdSize}
      shape="circle"
      htmlType="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "shrink-0 transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      icon={
        <Icon className={cn("text-muted-foreground", iconSizeClasses[size])} />
      }
    />
  );
}
