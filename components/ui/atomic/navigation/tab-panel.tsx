import { ReactNode } from "react";
import { TabsContent as ShadcnTabsContent } from "@/components/ui/primitives/shadcn/tabs";

interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({
  value,
  children,
  className = "space-y-4",
}: TabPanelProps) {
  return (
    <ShadcnTabsContent value={value} className={className}>
      {children}
    </ShadcnTabsContent>
  );
}
