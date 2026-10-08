"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useBillingPermissions } from "@/lib/hooks/billing";
import { FinanceNoPermission } from "../module/FinanceModuleUnavailable";
import { FinanceDashboard } from "./FinanceDashboard";
import { ReceivablesReport } from "./ReceivablesReport";

/** I. Reportes (`billing_reports`): por cobrar y dashboard. */
export function ReportsPage() {
  const permissions = useBillingPermissions();
  const { t } = useI18n();
  if (!permissions.canViewReports) {
    return <FinanceNoPermission description={t("billing.reports.noPermission")} />;
  }
  return (
    <div className="space-y-6">
      <Header level={1} title={t("billing.reports.title")} description={t("billing.reports.description")} />
      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">{t("billing.reports.receivablesTab")}</TabsTrigger>
          <TabsTrigger value="dashboard">{t("billing.reports.dashboardTab")}</TabsTrigger>
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
