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
  Input,
  Label,
} from "@/components/ui";
import { leadDisplayName, type Lead, type LeadConversionResult } from "@/lib/entity/leads";
import { LEAD_SHORT_TEXT_MAX, isSafeLeadText } from "@/lib/entity/leads/schemas";
import { useConvertLead } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { LeadConversionSummary } from "./LeadConversionSummary";

interface ConvertLeadDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

/** Convertir en paciente sin reservar cita (`conversionMethod: "MANUAL"`). Requiere `leads_manage`. */
export function ConvertLeadDialog({ lead, onOpenChange }: ConvertLeadDialogProps) {
  const open = lead !== null;
  const convert = useConvertLead();
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadConversionResult | null>(null);
  const requireName = !!lead && !lead.fullName?.trim();

  useEffect(() => {
    if (lead) {
      setFullName("");
      setNameError(null);
      setError(null);
      setResult(null);
    }
    // Solo al abrir para otro prospecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const submit = async () => {
    if (!lead) return;
    const name = fullName.trim();
    if (requireName && !name) return setNameError("Indica el nombre para crear al paciente.");
    if (!isSafeLeadText(name)) return setNameError("No se admiten los caracteres < ni >.");
    setNameError(null);
    setError(null);
    try {
      setResult(await convert.mutateAsync({ id: lead.id, data: name ? { fullName: name } : undefined }));
    } catch (err) {
      if (!isLeadModuleDisabledError(err)) setError(leadErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !convert.isPending && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">{result ? "Listo" : "Convertir sin cita"}</DialogTitle>
          <DialogDescription className="text-subtle">
            {result
              ? leadDisplayName(result.lead)
              : lead
                ? `«${leadDisplayName(lead)}» pasará a ser paciente de la clínica sin agendar una cita.`
                : ""}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <LeadConversionSummary result={result} onNavigate={() => onOpenChange(false)} />
        ) : (
          <>
            {requireName && (
              <div className="space-y-1.5">
                <Label htmlFor="convert-lead-name">Nombre del paciente</Label>
                <Input
                  id="convert-lead-name"
                  value={fullName}
                  maxLength={LEAD_SHORT_TEXT_MAX}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "convert-lead-name-error" : undefined}
                  autoComplete="off"
                />
                {nameError && (
                  <p id="convert-lead-name-error" className="text-sm text-rose-600 dark:text-rose-300">
                    {nameError}
                  </p>
                )}
              </div>
            )}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={convert.isPending}>
            {result ? "Cerrar" : "Cancelar"}
          </Button>
          {!result && (
            <Button type="button" onClick={submit} disabled={convert.isPending}>
              {convert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Convertir en paciente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
