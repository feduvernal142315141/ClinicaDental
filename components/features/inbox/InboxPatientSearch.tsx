"use client";

import * as React from "react";
import { Search, User } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Input } from "@/components/ui/atomic/forms/input";
import { ScrollArea } from "@/components/ui/primitives/shadcn/scroll-area";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/primitives/shadcn/sheet";
import { patientsService } from "@/lib/services/patients";
import type { Patient } from "@/lib/entity/patients";

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxPatientSearchProps {
  open: boolean;
  onSelect: (patientId: string) => void;
  onClose: () => void;
}

export function InboxPatientSearch({
  open,
  onSelect,
  onClose,
}: InboxPatientSearchProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Patient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search patients on query change (debounced)
  React.useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await patientsService.getPatients({
          q: query.trim(),
          page: 1,
          pageSize: 20,
          active: true,
        });
        setResults(response.entities ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const handleSelect = React.useCallback(
    (patientId: string) => {
      onSelect(patientId);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Vincular paciente</SheetTitle>
          <SheetDescription>
            Busca y selecciona un paciente para vincular a esta conversación.
          </SheetDescription>
        </SheetHeader>

        {/* Search input */}
        <div className="relative px-4">
          <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o teléfono del paciente..."
            className="pl-9 text-sm"
            autoFocus
          />
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 px-4 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" message="Buscando pacientes..." />
            </div>
          ) : query.trim().length < 2 ? (
            <p className="py-8 text-center text-xs text-subtle">
              Escribe al menos 2 caracteres para buscar.
            </p>
          ) : results.length === 0 ? (
            <EmptyState
              icon={User}
              title="Sin resultados"
              description="No se encontraron pacientes con ese criterio."
              className="py-8"
            />
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelect(patient.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    "hover:bg-hover",
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10">
                    <User className="size-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {patient.name}
                    </p>
                    {patient.phone && (
                      <p className="truncate text-xs text-subtle">
                        {patient.phone}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
