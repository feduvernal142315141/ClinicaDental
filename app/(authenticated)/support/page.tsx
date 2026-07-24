"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Inbox,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/atomic/data-display/card";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { FeedbackTicketDetailDrawer } from "@/components/features/feedback/FeedbackTicketDetailDrawer";
import { useFeedback } from "@/lib/hooks/feedback/use-feedback";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_TYPE_COLORS,
} from "@/lib/entity/feedback";
import type {
  FeedbackStatus,
  FeedbackType,
  FeedbackTicketSummary,
} from "@/lib/entity/feedback";
import { cn } from "@/lib/utils/utils";

const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  improvement: Lightbulb,
  question: HelpCircle,
  other: MoreHorizontal,
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Error",
  improvement: "Mejora",
  question: "Pregunta",
  other: "Otro",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-rose-600 dark:text-rose-400",
};

function TicketCard({
  ticket,
  onView,
}: {
  ticket: FeedbackTicketSummary;
  onView: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[ticket.type] ?? MoreHorizontal;
  const date = new Date(ticket.createdAt);
  const formattedDate = date.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
              FEEDBACK_TYPE_COLORS[ticket.type] ?? FEEDBACK_TYPE_COLORS.other,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug text-ink line-clamp-2">
                {ticket.subject}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    FEEDBACK_STATUS_COLORS[ticket.status],
                  )}
                >
                  {FEEDBACK_STATUS_LABELS[ticket.status]}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-subtle hover:text-brand"
                  onClick={() => onView(ticket.id)}
                  aria-label={`Ver detalle de ${ticket.subject}`}
                  title="Ver detalle"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <Badge variant="outline" className="text-[10px] px-1.5">
                {TYPE_LABELS[ticket.type] ?? "Otro"}
              </Badge>
              {ticket.priority ? (
                <span
                  className={cn(
                    "font-medium",
                    PRIORITY_COLORS[ticket.priority] ?? "",
                  )}
                >
                  {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportPage() {
  const { tickets, loading, fetchTickets } = useFeedback();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const reloadTickets = useCallback(() => {
    fetchTickets({
      page: 1,
      pageSize: 50,
      status: statusFilter !== "all" ? (statusFilter as FeedbackStatus) : undefined,
      type: typeFilter !== "all" ? (typeFilter as FeedbackType) : undefined,
    });
  }, [fetchTickets, statusFilter, typeFilter]);

  useEffect(() => {
    reloadTickets();
  }, [reloadTickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Tus reportes de errores, mejoras y preguntas"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_review">En revisión</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="bug">Error</SelectItem>
            <SelectItem value="improvement">Mejora</SelectItem>
            <SelectItem value="question">Pregunta</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner message="Cargando reportes..." />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin reportes todavía"
          description="Usa el botón morado en la esquina inferior derecha para reportar un error, sugerencia o pregunta desde cualquier pantalla."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onView={setSelectedTicketId}
            />
          ))}
        </div>
      )}

      <FeedbackTicketDetailDrawer
        ticketId={selectedTicketId}
        open={Boolean(selectedTicketId)}
        onClose={() => setSelectedTicketId(null)}
        onUpdated={reloadTickets}
      />
    </div>
  );
}
