"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui";
import { Plus, Filter, Pencil, Trash2, Users } from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useGrowthSegments, useSegmentEvaluation } from "@/lib/hooks/growth";
import { useLeadModule, useLeadServiceOptions, useLeadUserOptions } from "@/lib/hooks/leads";
import {
  SEGMENT_AUDIENCES,
  SEGMENT_AUDIENCE_LABELS,
  audienceCountLabel,
  formatSegmentCondition,
  parseFilterDefinition,
  segmentAudience,
  type SegmentAudience,
} from "@/lib/entity/growth";
import { cn } from "@/lib/utils/utils";
import { AudienceBadge } from "../shared/AudienceBadge";
import { SegmentPreview } from "../shared/SegmentPreview";

type AudienceFilter = SegmentAudience | "ALL";

export function GrowthSegmentList() {
  const router = useRouter();
  const { language, t } = useI18n();
  const { segments, loading, error, remove } = useGrowthSegments();
  const { evaluation, evaluating, evaluate } = useSegmentEvaluation();
  const [evaluatedSegmentId, setEvaluatedSegmentId] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("ALL");
  const { enabled: leadModuleEnabled } = useLeadModule();

  // Audiences only show up when the clinic has prospects (or already has a segment of them):
  // without the module the list looks exactly as before.
  const showAudience =
    leadModuleEnabled || segments.some((segment) => segmentAudience(segment.audience) === "LEAD");
  const visibleSegments =
    !showAudience || audienceFilter === "ALL"
      ? segments
      : segments.filter((segment) => segmentAudience(segment.audience) === audienceFilter);

  // Names for conditions that hold ids (services, users).
  const { data: services } = useLeadServiceOptions(showAudience);
  const { data: users } = useLeadUserOptions(showAudience);
  const resolveName = useCallback(
    (field: string, value: string) => {
      if (field === "serviceId" || field === "interestServiceId") return services?.find((s) => s.id === value)?.name;
      if (field === "doctorId" || field === "assignedToUserId") return users?.find((u) => u.id === value)?.name;
      return undefined;
    },
    [services, users],
  );

  const handleEvaluate = useCallback(
    async (id: string) => {
      setEvaluatedSegmentId(id);
      await evaluate(id);
    },
    [evaluate],
  );

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/growth/segments/${id}`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <Header
        level={1}
        title={t("growth.segments.title")}
        description={t("growth.segments.description")}
        action={
          <Button onClick={() => router.push("/growth/segments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("growth.segments.new")}
          </Button>
        }
      />

      {error && segments.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{t("growth.segments.refreshError")}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message={t("growth.segments.loading")} />
        </div>
      )}

      {!loading && segments.length === 0 && (
        <EmptyState
          icon={Filter}
          title={t("growth.segments.emptyTitle")}
          description={t("growth.segments.emptyDescription")}
          variant="card"
          action={
            <Button onClick={() => router.push("/growth/segments/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("growth.segments.new")}
            </Button>
          }
        />
      )}

      {!loading && segments.length > 0 && showAudience && (
        <div role="group" aria-label="Filtrar por audiencia" className="flex flex-wrap gap-2">
          {(["ALL", ...SEGMENT_AUDIENCES] as AudienceFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={audienceFilter === option}
              onClick={() => setAudienceFilter(option)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                audienceFilter === option
                  ? "border-brand bg-brand/10 font-medium text-brand"
                  : "border-hairline bg-surface text-subtle hover:text-ink",
              )}
            >
              {option === "ALL" ? "Todos" : SEGMENT_AUDIENCE_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {!loading && segments.length > 0 && visibleSegments.length === 0 && (
        <p className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-subtle">
          No hay segmentos de {audienceFilter === "LEAD" ? "prospectos" : "pacientes"} todavía.
        </p>
      )}

      {!loading && visibleSegments.length > 0 && (
        <div className="space-y-3">
          {visibleSegments.map((segment) => {
            const conditions = parseFilterDefinition(segment.filterDefinition).conditions;
            const audience = segmentAudience(segment.audience);
            return (
              <div
                key={segment.id}
                className="rounded-xl border border-hairline bg-surface p-4 cursor-pointer hover:border-foreground/15 transition-colors"
                onClick={() => handleRowClick(segment.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-ink">{segment.name}</h3>
                      {showAudience && <AudienceBadge audience={audience} />}
                    </div>
                    {segment.description && (
                      <p className="text-sm text-subtle">{segment.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {conditions.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-hover px-2 py-0.5 text-xs text-subtle ring-1 ring-hairline"
                        >
                          {formatSegmentCondition(c, resolveName)}
                        </span>
                      ))}
                      {conditions.length > 1 && (
                        <span className="text-xs text-subtle font-medium px-1">
                          (AND)
                        </span>
                      )}
                    </div>
                    {segment.cachedCount != null && (
                      <p className="text-xs text-subtle mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        ~{audience === "LEAD"
                          ? audienceCountLabel("LEAD", segment.cachedCount)
                          : t("growth.segments.patientCount").replace(
                              "{count}",
                              segment.cachedCount.toLocaleString(language),
                            )}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEvaluate(segment.id)}
                      disabled={evaluating}
                      title={t("growth.segments.calculateAudience")}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        router.push(`/growth/segments/${segment.id}`)
                      }
                      title={t("growth.actions.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title={t("growth.actions.delete")}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("growth.segments.deleteTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("growth.segments.deleteDescription").replace(
                              "{name}",
                              segment.name,
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("growth.actions.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove(segment.id)}
                          >
                            {t("growth.actions.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {evaluatedSegmentId === segment.id && evaluation && !evaluating && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-3 cursor-default border-t border-hairline pt-3">
                    <SegmentPreview evaluation={evaluation} audience={audience} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
