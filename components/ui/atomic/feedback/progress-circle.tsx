import { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

interface ProgressCircleProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
};

const strokeWidthMap = {
  sm: 6,
  md: 8,
  lg: 10,
};

export function ProgressCircle({
  value,
  size = "md",
  className,
  children,
}: ProgressCircleProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const strokeWidth = strokeWidthMap[size];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <svg
        className="transform -rotate-90"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.2"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="oklch(0.6 0.15 270)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
