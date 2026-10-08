"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui";
import { Plus, Megaphone, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { ClinicLanguage } from "@/lib/entity/settings";
import { useGrowthCampaigns } from "@/lib/hooks/growth";
import { GrowthCampaignStatusBadge } from "./GrowthCampaignStatusBadge";
import { AudienceBadge } from "../shared/AudienceBadge";
import { segmentAudience } from "@/lib/entity/growth";
import { useLeadModule } from "@/lib/hooks/leads";
import { GrowthCampaignActions } from "./GrowthCampaignActions";
import type { GrowthCampaign } from "@/lib/entity/growth";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/entity/growth";
import type { GrowthCampaignType } from "@/lib/entity/growth";

function formatDate(iso: string | undefined, language: ClinicLanguage): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(language, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}


export function GrowthCampaignList() {
  const router = useRouter();
  const { language, t } = useI18n();
  const { campaigns, pagination, loading, error, query, setQuery, refresh } =
    useGrowthCampaigns();

  // Audiences only show up when the clinic has prospects (or the campaign is for them):
  // without the module the list looks exactly as before.
  const { enabled: leadModuleEnabled } = useLeadModule();
  const showsAudience = (audience: string | undefined) =>
    leadModuleEnabled || segmentAudience(audience) === "LEAD";

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/growth/campaigns/${id}`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={t("growth.campaigns.title")}
        description={t("growth.campaigns.description")}
        action={
          <Button onClick={() => router.push("/growth/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("growth.campaigns.new")}
          </Button>
        }
      />

      {error && campaigns.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{t("growth.campaigns.refreshError")}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message={t("growth.campaigns.loading")} />
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={t("growth.campaigns.emptyTitle")}
          description={t("growth.campaigns.emptyDescription")}
          variant="card"
          action={
            <Button onClick={() => router.push("/growth/campaigns/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("growth.campaigns.new")}
            </Button>
          }
        />
      )}

      {!loading && campaigns.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-xl border border-hairline">
              <div className="px-4 py-2 border-b border-hairline bg-hover/50">
                <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
                  <Info className="h-3 w-3" />
                  {t("growth.campaigns.lifetimeMetrics")}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("growth.campaigns.column.campaign")}</TableHead>
                    <TableHead>{t("growth.campaigns.column.status")}</TableHead>
                    <TableHead className="text-right">{t("growth.campaigns.column.audience")}</TableHead>
                    <TableHead className="text-right">{t("growth.metric.sent")}</TableHead>
                    <TableHead className="text-right">{t("growth.metric.delivered")}</TableHead>
                    <TableHead className="text-right">{t("growth.metric.read")}</TableHead>
                    <TableHead className="text-right">{t("growth.metric.replied")}</TableHead>
                    <TableHead>{t("growth.campaigns.column.date")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(c.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-ink">{c.name}</p>
                          <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                            {CAMPAIGN_TYPE_LABELS[c.campaignType as GrowthCampaignType] ?? c.campaignType}
                            {showsAudience(c.audience) && <AudienceBadge audience={c.audience} />}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GrowthCampaignStatusBadge
                          status={c.growthStatus}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.estimatedAudienceCount ?? 0).toLocaleString(language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalSent.toLocaleString(language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalDelivered.toLocaleString(language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalRead.toLocaleString(language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalReplied.toLocaleString(language)}
                      </TableCell>
                      <TableCell className="text-xs text-subtle">
                        {formatDate(c.createdAt, language)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <GrowthCampaignActions
                          campaignId={c.id}
                          status={c.growthStatus}
                          onActionComplete={refresh}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            <p className="text-xs text-subtle flex items-center gap-1">
              <Info className="h-3 w-3" />
              {t("growth.campaigns.totalMetrics")}
            </p>
            {campaigns.map((c) => (
              <MobileCampaignCard
                key={c.id}
                campaign={c}
                showAudience={showsAudience(c.audience)}
                language={language}
                labels={{
                  sent: t("growth.metric.sent"),
                  delivered: t("growth.metric.delivered"),
                  read: t("growth.metric.read"),
                }}
                onClick={() => handleRowClick(c.id)}
                onActionComplete={refresh}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > pagination.pageSize && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-subtle">
                {t("growth.campaigns.totalCount").replace(
                  "{count}",
                  pagination.total.toLocaleString(language),
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={query.page === 0}
                  onClick={() =>
                    setQuery({ ...query, page: (query.page ?? 1) - 1 })
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">{t("app.table.previousPage")}</span>
                </Button>
                <span className="text-sm tabular-nums text-ink">
                  {(query.page ?? 0) + 1} / {Math.ceil(pagination.total / pagination.pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={
                    (query.page ?? 0) + 1 >=
                    Math.ceil(pagination.total / pagination.pageSize)
                  }
                  onClick={() =>
                    setQuery({ ...query, page: (query.page ?? 0) + 1 })
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">{t("app.table.nextPage")}</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MobileCampaignCard({
  campaign: c,
  showAudience,
  language,
  labels,
  onClick,
  onActionComplete,
}: {
  campaign: GrowthCampaign;
  showAudience: boolean;
  language: ClinicLanguage;
  labels: {
    sent: string;
    delivered: string;
    read: string;
  };
  onClick: () => void;
  onActionComplete: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-hairline bg-surface p-4 space-y-3 cursor-pointer active:bg-hover"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink">{c.name}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            {CAMPAIGN_TYPE_LABELS[c.campaignType as GrowthCampaignType] ?? c.campaignType}
            {showAudience && <AudienceBadge audience={c.audience} />}
          </p>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <GrowthCampaignStatusBadge status={c.growthStatus} />
          <GrowthCampaignActions
            campaignId={c.id}
            status={c.growthStatus}
            onActionComplete={onActionComplete}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {c.totalSent.toLocaleString(language)}
          </p>
          <p className="text-[10px] text-subtle">{labels.sent}</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {c.totalDelivered.toLocaleString(language)}
          </p>
          <p className="text-[10px] text-subtle">{labels.delivered}</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {c.totalRead.toLocaleString(language)}
          </p>
          <p className="text-[10px] text-subtle">{labels.read}</p>
        </div>
      </div>
    </div>
  );
}
