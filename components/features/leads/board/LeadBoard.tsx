"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Alert, AlertDescription, Button } from "@/components/ui";
import { LinesSkeleton } from "@/components/features/billing/shared/BillingSkeletons";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  hasPendingPatientMatch,
  isLeadOpen,
  isOpenStage,
  pipelineStageCount,
  type Lead,
  type LeadFilters,
  type LeadPipeline,
  type LeadStage,
} from "@/lib/entity/leads";
import {
  optionName,
  useChangeLeadStage,
  useLeadList,
  useLeadUserOptions,
  type LeadOption,
  type LeadPermissions,
} from "@/lib/hooks/leads";
import { leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/utils";
import { notifyLeadError } from "../shared/lead-notify";
import { LeadCard, type LeadCardActions } from "./LeadCard";

const COLUMN_STEP = 20;
const COLUMN_MAX = 100;

export type LeadDropAction =
  | { kind: "none" }
  | { kind: "stage"; stage: "NEW" | "CONTACTED" | "QUALIFIED" }
  | { kind: "book" }
  | { kind: "lose" }
  | { kind: "blocked"; reason: string };

/**
 * Qué hacer al soltar una tarjeta en una columna (lógica pura, testeable):
 * entre Nuevo/Contactado/Calificado cambia la etapa; "Convertido" abre la reserva y
 * "Cerrado" abre el cierre con motivo. Convertir y cerrar nunca se hacen con `/stage`.
 */
export function resolveLeadDrop(lead: Lead, target: LeadStage, permissions: LeadPermissions): LeadDropAction {
  if (!isLeadOpen(lead)) return { kind: "blocked", reason: "Un prospecto cerrado o convertido no se puede mover." };
  if (target === lead.stage) return { kind: "none" };
  if (target === "CONVERTED") {
    if (!permissions.canEdit) return { kind: "blocked", reason: "No tienes permiso para reservar citas." };
    if (hasPendingPatientMatch(lead)) {
      return { kind: "blocked", reason: "Primero resuelve si este prospecto es un paciente existente." };
    }
    return { kind: "book" };
  }
  if (target === "LOST") {
    return permissions.canManage
      ? { kind: "lose" }
      : { kind: "blocked", reason: "No tienes permiso para cerrar prospectos." };
  }
  if (!permissions.canEdit) return { kind: "blocked", reason: "No tienes permiso para cambiar la etapa." };
  return isOpenStage(target) ? { kind: "stage", stage: target } : { kind: "none" };
}

interface LeadBoardProps {
  filters: LeadFilters;
  pipeline: LeadPipeline | undefined;
  permissions: LeadPermissions;
  onBook: (lead: Lead) => void;
  onLose: (lead: Lead) => void;
}

/** Tablero: cinco columnas por etapa. Cada columna carga sus tarjetas con `GET /leads?stage=`. */
export function LeadBoard({ filters, pipeline, permissions, onBook, onLose }: LeadBoardProps) {
  const users = useLeadUserOptions();
  const changeStage = useChangeLeadStage();
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Distancia mínima: un clic en el nombre o en el menú no inicia un arrastre.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const move = async (lead: Lead, stage: "NEW" | "CONTACTED" | "QUALIFIED") => {
    setBusyId(lead.id);
    try {
      await changeStage.mutateAsync({ id: lead.id, stage });
    } catch (error) {
      notifyLeadError(error, "No se pudo mover el prospecto");
    } finally {
      setBusyId(null);
    }
  };

  const drop = (lead: Lead, target: LeadStage) => {
    const action = resolveLeadDrop(lead, target, permissions);
    if (action.kind === "stage") void move(lead, action.stage);
    else if (action.kind === "book") onBook(lead);
    else if (action.kind === "lose") onLose(lead);
    else if (action.kind === "blocked") notify.warning("No se puede mover", { description: action.reason });
  };

  const actions: LeadCardActions = {
    onMove: (lead, stage) => void move(lead, stage),
    onBook: (lead) => drop(lead, "CONVERTED"),
    onLose,
  };

  const onDragStart = (event: DragStartEvent) => setDragging((event.active.data.current?.lead as Lead) ?? null);
  const onDragEnd = (event: DragEndEvent) => {
    const lead = event.active.data.current?.lead as Lead | undefined;
    const target = event.over?.id as LeadStage | undefined;
    setDragging(null);
    if (lead && target) drop(lead, target);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div
        className="flex snap-x gap-3 overflow-x-auto pb-3 xl:grid xl:grid-cols-5 xl:overflow-visible"
        role="list"
        aria-label="Tablero de prospectos por etapa"
      >
        {LEAD_STAGES.map((stage) => (
          <LeadColumn
            key={stage}
            stage={stage}
            filters={filters}
            count={pipeline ? pipelineStageCount(pipeline, stage) : undefined}
            existingPatients={stage === "LOST" ? pipeline?.lostAsExistingPatient : undefined}
            permissions={permissions}
            users={users.data}
            busyId={busyId}
            draggingId={dragging?.id ?? null}
            actions={actions}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging && (
          <LeadCard
            lead={dragging}
            assigneeName={optionName(users.data, dragging.assignedToUserId)}
            permissions={permissions}
            className="rotate-1 cursor-grabbing shadow-lg"
            {...actions}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface LeadColumnProps {
  stage: LeadStage;
  filters: LeadFilters;
  count: number | undefined;
  existingPatients: number | undefined;
  permissions: LeadPermissions;
  users: LeadOption[] | undefined;
  busyId: string | null;
  draggingId: string | null;
  actions: LeadCardActions;
}

function LeadColumn({
  stage,
  filters,
  count,
  existingPatients,
  permissions,
  users,
  busyId,
  draggingId,
  actions,
}: LeadColumnProps) {
  const [pageSize, setPageSize] = useState(COLUMN_STEP);
  const { data, isPending, isError, error, isFetching, refetch } = useLeadList({ ...filters, stage, page: 0, pageSize });
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const leads = data?.entities ?? [];
  const total = data?.pagination.total ?? count ?? 0;
  const label = LEAD_STAGE_LABELS[stage];

  return (
    <section
      ref={setNodeRef}
      role="listitem"
      aria-label={`${label}: ${count ?? total} prospectos`}
      className={cn(
        "flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-bento border border-hairline bg-elevated/60 xl:w-auto xl:max-w-none",
        isOver && draggingId && "border-brand/60 bg-brand/5",
      )}
    >
      <header className="space-y-0.5 border-b border-hairline px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{label}</h2>
          <span className="rounded-full bg-hover px-2 py-0.5 text-xs font-semibold tabular-nums text-subtle">
            {count ?? total}
          </span>
        </div>
        {stage === "LOST" && existingPatients !== undefined && (count ?? 0) > 0 && (
          <p className="text-xs text-subtle">
            {(count ?? 0) - existingPatients} perdidos · {existingPatients} ya eran pacientes
          </p>
        )}
      </header>

      <div className="flex-1 space-y-2 p-2">
        {isPending ? (
          <LinesSkeleton lines={4} label={`Cargando ${label}…`} className="p-2" />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <p>{leadErrorMessage(error)}</p>
              <Button size="sm" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : leads.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-subtle">Sin prospectos</p>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              assigneeName={optionName(users, lead.assignedToUserId)}
              permissions={permissions}
              busy={busyId === lead.id}
              hidden={draggingId === lead.id}
              actions={actions}
            />
          ))
        )}
        {leads.length < total && pageSize < COLUMN_MAX && (
          <Button
            variant="ghost"
            size="sm"
            block
            disabled={isFetching}
            onClick={() => setPageSize((size) => Math.min(size + COLUMN_STEP, COLUMN_MAX))}
          >
            Ver más ({total - leads.length})
          </Button>
        )}
        {leads.length < total && pageSize >= COLUMN_MAX && (
          <p className="px-2 py-1 text-center text-xs text-subtle">
            Hay más prospectos en esta etapa. Usa la lista o los filtros para verlos.
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableLeadCard({
  lead,
  assigneeName,
  permissions,
  busy,
  hidden,
  actions,
}: {
  lead: Lead;
  assigneeName?: string;
  permissions: LeadPermissions;
  busy: boolean;
  hidden: boolean;
  actions: LeadCardActions;
}) {
  // Solo se arrastran los abiertos y solo por quien puede hacer algo al soltarlos.
  const draggable = isLeadOpen(lead) && (permissions.canEdit || permissions.canManage) && !busy;
  const { setNodeRef, listeners } = useDraggable({ id: lead.id, data: { lead }, disabled: !draggable });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      className={cn(draggable && "cursor-grab touch-manipulation", hidden && "opacity-30")}
    >
      <LeadCard lead={lead} assigneeName={assigneeName} permissions={permissions} busy={busy} {...actions} />
    </div>
  );
}
