"use client";

import { useEffect, useState } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Inbox,
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

function TicketCard({ ticket }: { ticket: FeedbackTicketSummary }) {
  const Icon = TYPE_ICONS[ticket.type] ?? MoreHorizontal;
  const date = new Date(ticket.createdAt);
  const formattedDate = date.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Icono de tipo */}
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${FEEDBACK_TYPE_COLORS[ticket.type] ?? FEEDBACK_TYPE_COLORS.other}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          {/* Contenido */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug text-ink line-clamp-2">
                {ticket.subject}
              </p>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${FEEDBACK_STATUS_COLORS[ticket.status]}`}
              >
                {FEEDBACK_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <Badge variant="outline" className="text-[10px] px-1.5">
                {TYPE_LABELS[ticket.type] ?? "Otro"}
              </Badge>
              {ticket.priority && (
                <span className={`font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                  {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                </span>
              )}
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

  useEffect(() => {
    fetchTickets({
      page: 1,
      pageSize: 50,
      status: statusFilter !== "all" ? (statusFilter as FeedbackStatus) : undefined,
      type: typeFilter !== "all" ? (typeFilter as FeedbackType) : undefined,
    });
  }, [fetchTickets, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Tus reportes de errores, mejoras y preguntas"
      />

      {/* Filtros */}
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

      {/* Lista de tickets */}
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
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
