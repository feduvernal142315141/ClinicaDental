"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Plus } from "lucide-react";
import { CustomTable } from "@/components/ui/composed/table/Table";
import useCampaignList from "@/components/campaign/hooks/useCampaignList";
import { LoadingSpinner } from "@/components/ui/antd";

export function CampaignList() {
  const {
    campaign,
    columns,
    total,
    pageSize,
    loading,
    setFilters,
    handlePageChange,
    handlePageSizeChange,
    onNewCampaign,
  } = useCampaignList();

  // Función estable para evitar re-renders de CustomTable
  const handlePageChangeWrapper = React.useCallback(
    (page: number) => {
      handlePageChange(page - 1);
    },
    [handlePageChange]
  );

  // Solo mostrar loading inicial, no cuando estamos filtrando
  const isInitialLoading = loading && campaign.length === 0;

  if (isInitialLoading) {
    return <LoadingSpinner description="Cargando campañas..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-end">
        <Button onClick={onNewCampaign} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      <Card className="bg-surface border-hairline">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="text-ink">
                Lista de Campañas
              </CardTitle>
              <CardDescription className="text-subtle">
                {campaign.length} campaña{campaign.length !== 1 ? "s" : ""}{" "}
                registrada
                {campaign.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {loading && (
              <div className="absolute top-2 right-2 z-10">
                <div className="flex items-center gap-2 bg-elevated/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-hairline">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm text-muted-foreground">
                    Filtrando...
                  </span>
                </div>
              </div>
            )}
            <CustomTable
              columns={columns}
              total={total}
              data={campaign}
              pageSize={pageSize}
              onPageChange={handlePageChangeWrapper}
              onPageSizeChange={handlePageSizeChange}
              onFilterChange={setFilters}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
