"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { cn } from "@/lib/utils/utils";

interface AuthFormCardProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  cardClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: ReactNode;
}

const DefaultAuthIcon = (
  <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
    <svg
      className="w-8 h-8 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  </div>
);

export function AuthFormCard({
  title,
  description,
  children,
  cardClassName,
  headerClassName,
  contentClassName,
  icon,
}: AuthFormCardProps) {
  return (
    <Card
      className={cn(
        "w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm",
        cardClassName
      )}
    >
      <CardHeader className={cn("text-center pb-8", headerClassName)}>
        {icon ?? DefaultAuthIcon}
        <CardTitle className="text-3xl font-bold text-gray-900">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-gray-600 text-base">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
