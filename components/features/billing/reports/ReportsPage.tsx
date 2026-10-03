"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useBillingPermissions } from "@/lib/hooks/billing";
import { FinanceNoPermission } from "../module/FinanceModuleUnavailable";
import { FinanceDashboard } from "./FinanceDashboard";
import { ReceivablesReport } from "./ReceivablesReport";

/** I. Reportes (`billing_reports`): por cobrar y dashboard. */
export function ReportsPage() {
  const permissions = useBillingPermissions();
  if (!permissions.canViewReports) {
    return <FinanceNoPermission description="Los reportes de Finanzas requieren el permiso «Reportes de Finanzas»." />;
  }
  return (
    <div className="space-y-6">
      <Header level={1} title="Reportes" description="Saldos por cobrar y resumen de lo emitido y cobrado." />
      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Por cobrar</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="receivables" className="mt-4">
          <ReceivablesReport />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <FinanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
