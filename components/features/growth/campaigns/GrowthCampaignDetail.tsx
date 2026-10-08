"use client";

import { useRouter } from "next/navigation";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui";
import { ArrowLeft, Info, Send, Eye, MessageCircleReply, CalendarPlus, Coins } from "lucide-react";
import { useGrowthCampaignDetail, useGrowthCampaignAnalytics, useGrowthConversions } from "@/lib/hooks/growth";
import { GrowthCampaignStatusBadge } from "./GrowthCampaignStatusBadge";
import { GrowthCampaignActions } from "./GrowthCampaignActions";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/entity/growth";
import type { GrowthCampaignType } from "@/lib/entity/growth";
import { Progress } from "@/components/ui/atomic/data-display/progress";
import Link from "next/link";
import { SEGMENT_RECIPIENTS_HIDDEN_MESSAGE, segmentAudience } from "@/lib/entity/growth";
import { useLeadAccess, useLeadModule } from "@/lib/hooks/leads";
import { AudienceBadge } from "../shared/AudienceBadge";
import { GrowthCampaignRecipients } from "./GrowthCampaignRecipients";

interface GrowthCampaignDetailProps {
  campaignId: string;
}

const ATTRIBUTION_METHOD_LABELS: Record<string, string> = {
  CONTEXT_WAMID: "Respuesta directa",
  QUICK_REPLY: "Botón de respuesta",
  TEMPORAL_FALLBACK: "Atribución temporal",
};

const CONVERSION_TYPE_LABELS: Record<string, string> = {
  REPLIED: "Respuesta",
  APPOINTMENT_CREATED: "Cita creada",
  APPOINTMENT_COMPLETED: "Cita completada",
};

function formatCurrency(value: number, currency: string | null): string {
  if (!value) return "—";
  if (!currency) return value.toLocaleString("es", { maximumFractionDigits: 0 });
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString("es");
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}


export function GrowthCampaignDetail({ campaignId }: GrowthCampaignDetailProps) {
  const router = useRouter();
  const { campaign, loading, error, refresh } = useGrowthCampaignDetail(campaignId);
  const { data: analytics } = useGrowthCampaignAnalytics(campaignId);
  const { data: conversionsData } = useGrowthConversions(campaignId);
  const { enabled: leadModuleEnabled } = useLeadModule();
  const { visible: canOpenLeads } = useLeadAccess();

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner message="Cargando campaña..." />
    </div>
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!campaign) return null;

  const isLeadCampaign = segmentAudience(campaign.audience) === "LEAD";
  const conversions = conversionsData?.entities ?? [];
  const conversionsTotal = conversionsData?.pagination?.total ?? 0;
  // Without permission over prospects the backend sends the total but not who converted.
  const conversionsHidden = isLeadCampaign && conversions.length === 0 && conversionsTotal > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/growth/campaigns")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
              <GrowthCampaignStatusBadge
                status={campaign.growthStatus}
              />
              {(isLeadCampaign || leadModuleEnabled) && <AudienceBadge audience={campaign.audience} />}
            </div>
            <p className="text-sm text-subtle mt-0.5">
              {CAMPAIGN_TYPE_LABELS[campaign.campaignType as GrowthCampaignType] ?? campaign.campaignType} · Creada {formatDate(campaign.createdAt)}
              {campaign.scheduledAt && ` · Programada ${formatDate(campaign.scheduledAt)}`}
            </p>
          </div>
        </div>
        <GrowthCampaignActions
          campaignId={campaignId}
          status={campaign.growthStatus}
          onActionComplete={refresh}
        />
      </div>

      {/* Info */}
      {(campaign.segmentName || campaign.templateName) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {campaign.segmentName && (
            <span className="text-subtle">
              Segmento: <span className="text-ink font-medium">{campaign.segmentName}</span>
            </span>
          )}
          {campaign.templateName && (
            <span className="text-subtle">
              Plantilla: <span className="text-ink font-medium">{campaign.templateName}</span>
            </span>
          )}
          <span className="text-subtle">
            Audiencia: <span className="text-ink font-medium">{(campaign.estimatedAudienceCount ?? 0).toLocaleString("es")}</span>
          </span>
        </div>
      )}

      {/* KPIs */}
      <KpiGrid cols={{ default: 2, md: 3, lg: 6 }} gap={4}>
        <KpiCard title="Enviados" value={campaign.totalSent.toLocaleString("es")} icon={Send} accent="brand" />
        <KpiCard title="Entregados" value={campaign.totalDelivered.toLocaleString("es")} icon={Send} accent="sky" description={analytics ? formatRate(analytics.delivered / (analytics.sent || 1)) : undefined} />
        <KpiCard title="Leídos" value={campaign.totalRead.toLocaleString("es")} icon={Eye} accent="violet" description={analytics ? formatRate(analytics.read / (analytics.sent || 1)) : undefined} />
        <KpiCard title="Respondieron" value={campaign.totalReplied.toLocaleString("es")} icon={MessageCircleReply} accent="amber" description={analytics ? formatRate(analytics.replied / (analytics.sent || 1)) : undefined} />
        <KpiCard title="Citas generadas" value={analytics ? analytics.appointmentsCreated.toLocaleString("es") : "—"} icon={CalendarPlus} accent="emerald" />
        <KpiCard title="Valor atribuido" value={analytics ? formatCurrency(analytics.attributedValue, null) : "—"} icon={Coins} accent="rose" />
      </KpiGrid>

      {/* Engagement + Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery metrics */}
        <DataCard title="Métricas de envío" description="Rendimiento del canal">
          <div className="space-y-4 py-2">
            {analytics ? (
              <>
                {[
                  { label: "Tasa de entrega", rate: analytics.delivered / (analytics.sent || 1) },
                  { label: "Tasa de lectura", rate: analytics.read / (analytics.sent || 1) },
                  { label: "Tasa de respuesta", rate: analytics.replied / (analytics.sent || 1) },
                ].map((m) => (
                  <div key={m.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-subtle">{m.label}</span>
                      <span className="font-semibold tabular-nums text-ink">
                        {formatRate(m.rate)}
                      </span>
                    </div>
                    <Progress value={m.rate * 100} className="h-1.5" />
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-subtle">Cargando analíticas...</p>
            )}
            {campaign.totalFailed > 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-300">
                {campaign.totalFailed.toLocaleString("es")} mensajes fallidos
              </p>
            )}
          </div>
        </DataCard>

        {/* Conversion metrics */}
        <DataCard title="Conversiones" description="Citas generadas y completadas">
          <div className="space-y-4 py-2">
            {analytics ? (
              <>
                {isLeadCampaign && campaign.convertedLeads != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-subtle">Prospectos convertidos</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {campaign.convertedLeads.toLocaleString("es")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle">Citas generadas</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {analytics.appointmentsCreated.toLocaleString("es")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle">Citas completadas</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {analytics.appointmentsCompleted.toLocaleString("es")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle">Tasa de conversión</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                    {formatRate(analytics.appointmentsCreated / (analytics.sent || 1))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle">Tasa de asistencia</span>
                  <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                    {formatRate(analytics.appointmentsCompleted / (analytics.appointmentsCreated || 1))}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-subtle">Cargando analíticas...</p>
            )}
          </div>
        </DataCard>
      </div>

      {/* Attributed value */}
      {analytics && (
        <DataCard
          title="Valor atribuido"
          description="Estimación basada en citas completadas"
        >
          <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Estimación basada en el costo del servicio asociado a las citas
                completadas. No representa ingresos cobrados.
              </TooltipContent>
            </Tooltip>
            No representa ingresos cobrados
          </p>
          <div className="flex items-end gap-8 py-4">
            <div>
              <p className="text-3xl font-bold tabular-nums text-ink">
                {formatCurrency(analytics.attributedValue, null)}
              </p>
              <p className="text-xs text-subtle mt-1">Total</p>
            </div>
            {analytics.appointmentsCompleted > 0 && (
              <div>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {formatCurrency(
                    analytics.attributedValue / analytics.appointmentsCompleted,
                    null,
                  )}
                </p>
                <p className="text-xs text-subtle mt-1">Promedio por cita</p>
              </div>
            )}
          </div>
        </DataCard>
      )}

      {/* Conversions breakdown */}
      {isLeadCampaign && <GrowthCampaignRecipients campaignId={campaignId} />}

      {conversionsHidden && (
        <DataCard title="Conversiones" description="Detalle de cada conversión atribuida">
          <div className="space-y-2 py-2">
            <p className="text-sm text-ink">
              <strong className="tabular-nums">{conversionsTotal.toLocaleString("es")}</strong>{" "}
              {conversionsTotal === 1 ? "conversión atribuida" : "conversiones atribuidas"}
            </p>
            <p className="rounded-lg bg-hover px-3 py-2 text-sm text-subtle">{SEGMENT_RECIPIENTS_HIDDEN_MESSAGE}</p>
          </div>
        </DataCard>
      )}

      {conversionsData && conversionsData.entities.length > 0 && (
        <DataCard
          title="Conversiones"
          description="Detalle de cada conversión atribuida"
        >
          <div className="space-y-3 py-2">
            {conversionsData.entities.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between rounded-lg bg-hover p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {CONVERSION_TYPE_LABELS[conv.conversionType] ?? conv.conversionType}
                  </p>
                  <p className="text-xs text-subtle">
                    {ATTRIBUTION_METHOD_LABELS[conv.attributionMethod] ?? conv.attributionMethod}
                    {conv.serviceName && ` · ${conv.serviceName}`}
                  </p>
                  {conv.leadId && canOpenLeads && (
                    <Link
                      href={`/leads/${conv.leadId}`}
                      className="text-xs font-medium text-brand underline-offset-2 hover:underline"
                    >
                      Ver prospecto
                    </Link>
                  )}
                </div>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(conv.attributedValue, conv.currency ?? null)}
                </p>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}
