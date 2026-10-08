"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, LayoutGrid, List, Settings, UserPlus, UserSearch } from "lucide-react";
import { Alert, AlertDescription, Button } from "@/components/ui";
import type { Lead } from "@/lib/entity/leads";
import { countActiveLeadFilters, useLeadFilters, useLeadPermissions, useLeadPipeline } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { cn } from "@/lib/utils/utils";
import { LeadBoard } from "./board/LeadBoard";
import { BookLeadDialog } from "./dialogs/BookLeadDialog";
import { LeadFormDialog } from "./dialogs/LeadFormDialog";
import { LoseLeadDialog } from "./dialogs/LoseLeadDialog";
import { LeadTable } from "./list/LeadTable";
import { LeadFiltersBar } from "./shared/LeadFiltersBar";

function Indicator({
  icon: Icon,
  label,
  count,
  active,
  onToggle,
}: {
  icon: typeof AlarmClock;
  label: string;
  count: number | undefined;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "bento flex items-center gap-3 p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        active ? "border-brand/60 bg-brand/5" : "hover:bg-hover",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hover text-ink">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold tabular-nums text-ink">{count ?? "—"}</span>
        <span className="block text-sm text-subtle">{label}</span>
      </span>
      <span className="ml-auto text-xs font-medium text-brand">{active ? "Quitar filtro" : "Ver"}</span>
    </button>
  );
}

/** Vista principal de "Adquisición de pacientes": tablero por etapa o lista, con filtros en la URL. */
export function LeadsPage() {
  const router = useRouter();
  const permissions = useLeadPermissions();
  const { state, search, setSearch, update, reset, view, setView, page, setPage, boardFilters, listFilters } =
    useLeadFilters();
  const pipeline = useLeadPipeline(boardFilters);
  const [creating, setCreating] = useState(false);
  const [booking, setBooking] = useState<Lead | null>(null);
  const [losing, setLosing] = useState<Lead | null>(null);
  const hasFilters = countActiveLeadFilters(state, view) > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Adquisición de pacientes</h1>
          <p className="text-subtle">Personas que todavía no son pacientes: del primer contacto a su primera cita.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-hairline p-0.5" role="group" aria-label="Vista">
            <Button
              variant={view === "board" ? "default" : "ghost"}
              size="sm"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              <LayoutGrid className="h-4 w-4" />
              Tablero
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
          <Button variant="outline" onClick={() => router.push("/leads/settings")}>
            <Settings className="h-4 w-4" />
            Configuración
          </Button>
          {permissions.canCreate && (
            <Button onClick={() => setCreating(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo prospecto
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Indicator
          icon={AlarmClock}
          label="Seguimientos vencidos"
          count={pipeline.data?.overdueFollowUps}
          active={state.overdue}
          onToggle={() => update({ overdue: !state.overdue })}
        />
        <Indicator
          icon={UserSearch}
          label="Coincidencias con pacientes por resolver"
          count={pipeline.data?.pendingPatientMatches}
          active={state.match}
          onToggle={() => update({ match: !state.match })}
        />
      </div>

      <LeadFiltersBar
        state={state}
        view={view}
        search={search}
        onSearchChange={setSearch}
        onChange={update}
        onReset={reset}
      />

      {pipeline.isError && !isLeadModuleDisabledError(pipeline.error) && (
        <Alert variant="destructive">
          <AlertDescription>{leadErrorMessage(pipeline.error)}</AlertDescription>
        </Alert>
      )}

      {view === "board" ? (
        <LeadBoard
          filters={boardFilters}
          pipeline={pipeline.data}
          permissions={permissions}
          onBook={setBooking}
          onLose={setLosing}
        />
      ) : (
        <LeadTable filters={listFilters} page={page} onPageChange={setPage} hasFilters={hasFilters} />
      )}

      <LeadFormDialog open={creating} onOpenChange={setCreating} onCreated={(lead) => router.push(`/leads/${lead.id}`)} />
      <BookLeadDialog lead={booking} onOpenChange={(open) => !open && setBooking(null)} />
      <LoseLeadDialog lead={losing} onOpenChange={(open) => !open && setLosing(null)} />
    </div>
  );
}
