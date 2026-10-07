"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { leadDisplayName, type Lead } from "@/lib/entity/leads";
import { useAssignLead, useLeadUserOptions } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";

const UNASSIGNED = "__none__";

interface AssignLeadDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

/** Asignar o desasignar el responsable (`userId: null` desasigna). */
export function AssignLeadDialog({ lead, onOpenChange }: AssignLeadDialogProps) {
  const open = lead !== null;
  const users = useLeadUserOptions(open);
  const assign = useAssignLead();
  const [userId, setUserId] = useState(UNASSIGNED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setUserId(lead.assignedToUserId ?? UNASSIGNED);
      setError(null);
    }
  }, [lead]);

  const save = async () => {
    if (!lead) return;
    setError(null);
    try {
      await assign.mutateAsync({ id: lead.id, userId: userId === UNASSIGNED ? null : userId });
      notify.success(userId === UNASSIGNED ? "Prospecto sin responsable" : "Responsable asignado");
      onOpenChange(false);
    } catch (err) {
      if (!isLeadModuleDisabledError(err)) setError(leadErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !assign.isPending && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Asignar responsable</DialogTitle>
          <DialogDescription className="text-subtle">
            {lead ? `Quién dará seguimiento a «${leadDisplayName(lead)}».` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-sm">Responsable</Label>
          <SearchSelect
            value={userId}
            onChange={setUserId}
            options={[
              { value: UNASSIGNED, label: "Sin asignar" },
              ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
            ]}
            searchable
            searchPlaceholder="Buscar persona…"
            aria-label="Responsable"
          />
        </div>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={save} disabled={assign.isPending}>
            {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
