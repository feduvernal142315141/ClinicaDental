import { ReactNode } from "react";
import {
  Tabs as ShadcnTabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";

export interface TabItem {
  value: string;
  label: string;
}

interface TabsContainerProps {
  defaultValue: string;
  tabs: TabItem[];
  children: ReactNode;
  className?: string;
}

export function TabsContainer({
  defaultValue,
  tabs,
  children,
  className = "space-y-4",
}: TabsContainerProps) {
  return (
    <ShadcnTabs defaultValue={defaultValue} className={className}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </ShadcnTabs>
  );
}
