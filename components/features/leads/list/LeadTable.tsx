"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { BillingPager } from "@/components/features/billing/shared/BillingPager";
import { TableSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import {
  hasPendingPatientMatch,
  leadDisplayName,
  leadSourceLabel,
  type LeadFilters,
} from "@/lib/entity/leads";
import { optionName, useLeadList, useLeadUserOptions } from "@/lib/hooks/leads";
import { leadErrorMessage } from "@/lib/services/leads";
import { cn } from "@/lib/utils/utils";
import { LeadMatchFlag, LeadStatusBadge, LeadTemperatureTag } from "../shared/LeadBadges";
import { formatLeadDateTime, formatLeadRelative } from "../shared/lead-format";

const PAGE_SIZE = 20;

interface LeadTableProps {
  filters: LeadFilters;
  page: number;
  onPageChange: (page: number) => void;
  hasFilters: boolean;
}

/** Lista paginada. Orden fijo del backend: última actividad, más reciente primero. */
export function LeadTable({ filters, page, onPageChange, hasFilters }: LeadTableProps) {
  const users = useLeadUserOptions();
  const { data, isPending, isError, error } = useLeadList({ ...filters, page, pageSize: PAGE_SIZE });
  const leads = data?.entities ?? [];

  if (isPending) return <TableSkeleton columns={6} label="Cargando prospectos…" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{leadErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        variant="card"
        title={hasFilters ? "Ningún prospecto coincide" : "Todavía no hay prospectos"}
        description={
          hasFilters
            ? "Prueba con otros filtros o quítalos para ver todos."
            : "Los prospectos aparecen aquí cuando alguien escribe por WhatsApp o cuando los registras a mano."
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Interés</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Próximo seguimiento</TableHead>
              <TableHead>Última actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="max-w-[240px]">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-ink hover:text-brand">
                    {leadDisplayName(lead)}
                  </Link>
                  {hasPendingPatientMatch(lead) && (
                    <div className="mt-1">
                      <LeadMatchFlag />
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{lead.phone ?? lead.phoneE164 ?? "—"}</TableCell>
                <TableCell>
                  <LeadStatusBadge lead={lead} />
                </TableCell>
                <TableCell>
                  <LeadTemperatureTag temperature={lead.temperature} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{leadSourceLabel(lead.source)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{lead.interestServiceName ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {optionName(users.data, lead.assignedToUserId) ?? (lead.assignedToUserId ? "Asignado" : "Sin asignar")}
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    lead.overdueFollowUp && "font-medium text-rose-700 dark:text-rose-300",
                  )}
                >
                  {lead.nextFollowUpAt ? formatLeadDateTime(lead.nextFollowUpAt) : "—"}
                  {lead.overdueFollowUp && <span className="block text-xs">Vencido</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-subtle">{formatLeadRelative(lead.lastActivityAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <BillingPager pagination={data?.pagination} onPageChange={onPageChange} noun="prospectos" />
    </div>
  );
}
