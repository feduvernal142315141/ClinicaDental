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
import { useGrowthCampaigns } from "@/lib/hooks/growth";
import { GrowthCampaignStatusBadge } from "./GrowthCampaignStatusBadge";
import { GrowthCampaignActions } from "./GrowthCampaignActions";
import type { GrowthCampaign } from "@/lib/entity/growth";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/entity/growth";
import type { GrowthCampaignType } from "@/lib/entity/growth";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es", {
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
  const { campaigns, pagination, loading, error, query, setQuery, refresh } =
    useGrowthCampaigns();

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
        title="Campañas"
        description="Gestiona tus campañas de Growth Marketing"
        action={
          <Button onClick={() => router.push("/growth/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva campaña
          </Button>
        }
      />

      {error && campaigns.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron actualizar las campañas.</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message="Cargando campañas..." />
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="Sin campañas"
          description="Crea tu primera campaña de Growth para empezar a medir resultados."
          variant="card"
          action={
            <Button onClick={() => router.push("/growth/campaigns/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva campaña
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
                  Métricas totales de la campaña (lifetime)
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Audiencia</TableHead>
                    <TableHead className="text-right">Enviados</TableHead>
                    <TableHead className="text-right">Entregados</TableHead>
                    <TableHead className="text-right">Leídos</TableHead>
                    <TableHead className="text-right">Respondieron</TableHead>
                    <TableHead>Fecha</TableHead>
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
                          <p className="text-xs text-subtle">
                            {CAMPAIGN_TYPE_LABELS[c.campaignType as GrowthCampaignType] ?? c.campaignType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GrowthCampaignStatusBadge
                          status={c.growthStatus}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(c.estimatedAudienceCount ?? 0).toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalSent.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalDelivered.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalRead.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.totalReplied.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-xs text-subtle">
                        {formatDate(c.createdAt)}
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
              Métricas totales de la campaña
            </p>
            {campaigns.map((c) => (
              <MobileCampaignCard
                key={c.id}
                campaign={c}
                onClick={() => handleRowClick(c.id)}
                onActionComplete={refresh}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > pagination.pageSize && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-subtle">
                {pagination.total.toLocaleString("es")} campañas
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
                  <span className="sr-only">Anterior</span>
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
                  <span className="sr-only">Siguiente</span>
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
  onClick,
  onActionComplete,
}: {
  campaign: GrowthCampaign;
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
          <p className="text-xs text-subtle">
            {CAMPAIGN_TYPE_LABELS[c.campaignType as GrowthCampaignType] ?? c.campaignType}
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
            {c.totalSent.toLocaleString("es")}
          </p>
          <p className="text-[10px] text-subtle">Enviados</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {c.totalDelivered.toLocaleString("es")}
          </p>
          <p className="text-[10px] text-subtle">Entregados</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-ink">
            {c.totalRead.toLocaleString("es")}
          </p>
          <p className="text-[10px] text-subtle">Leídos</p>
        </div>
      </div>
    </div>
  );
}
