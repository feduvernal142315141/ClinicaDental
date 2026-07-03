"use client";

/**
 * ExamFindingsSection — sección colapsable de hallazgos del examen clínico.
 *
 * Persiste hacia ExamFindings (extraoral + intraoral) vía callbacks.
 * Los campos son texto libre estructurado; el backend acepta cualquier subconjunto.
 */

import { useState } from "react";
import { ChevronDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import TextArea from "@/components/ui/atomic/forms/textarea";
import type {
  ExamFindings,
  ExamFindingsExtraoral,
  ExamFindingsIntraoral,
} from "@/lib/entity/clinical-history";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExamFindingsSectionProps {
  findings: ExamFindings;
  onUpdateExtraoral: (field: keyof ExamFindingsExtraoral, value: string) => void;
  onUpdateIntraoral: (field: keyof ExamFindingsIntraoral, value: string) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const EXTRAORAL_FIELDS: Array<{
  key: keyof ExamFindingsExtraoral;
  label: string;
  placeholder: string;
}> = [
  {
    key: "facialAsymmetry",
    label: "Simetría y morfología facial",
    placeholder: "Simetría normal, sin hallazgos patológicos…",
  },
  {
    key: "lips",
    label: "Labios",
    placeholder: "Labios competentes, mucosa rosada…",
  },
  {
    key: "lymphNodes",
    label: "Nódulos linfáticos / lesiones",
    placeholder: "Sin adenopatías palpables…",
  },
  {
    key: "tmjNotes",
    label: "ATM (articulación temporomandibular)",
    placeholder: "Sin ruidos articulares, apertura bucal normal…",
  },
  {
    key: "other",
    label: "Otros hallazgos extraorales",
    placeholder: "",
  },
];

const INTRAORAL_FIELDS: Array<{
  key: keyof ExamFindingsIntraoral;
  label: string;
  placeholder: string;
}> = [
  {
    key: "softTissue",
    label: "Mucosa oral (tejidos blandos)",
    placeholder: "Mucosa rosada, sin lesiones, sin ulceraciones…",
  },
  {
    key: "periodontium",
    label: "Encía y periodonto",
    placeholder: "Encía rosa coral, contorno festoneado, sin sangrado al sondeo…",
  },
  {
    key: "hardTissue",
    label: "Paladar y mucosa dura",
    placeholder: "Paladar duro y blando sin alteraciones…",
  },
  {
    key: "occlusion",
    label: "Oclusión / piezas presentes",
    placeholder: "Clase I de Angle, dentición completa (excluye…)…",
  },
  {
    key: "hygiene",
    label: "Higiene oral",
    placeholder: "Higiene aceptable, depósitos de cálculo leve en…",
  },
  {
    key: "other",
    label: "Otros hallazgos intraorales",
    placeholder: "",
  },
];

// ---------------------------------------------------------------------------
// Sub-section component
// ---------------------------------------------------------------------------

function SubSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-hairline overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left bg-elevated hover:bg-hover transition-colors"
      >
        <span className="flex-1 text-xs font-semibold text-ink">{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-2 space-y-3 bg-surface">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExamFindingsSection({
  findings,
  onUpdateExtraoral,
  onUpdateIntraoral,
  disabled = false,
}: ExamFindingsSectionProps) {
  const [open, setOpen] = useState(false);

  const hasExtraoral = Object.values(findings.extraoral ?? {}).some(
    (v) => typeof v === "string" && v.trim(),
  );
  const hasIntraoral = Object.values(findings.intraoral ?? {}).some(
    (v) => typeof v === "string" && v.trim(),
  );
  const hasAny = hasExtraoral || hasIntraoral;

  return (
    <div className="rounded-xl border border-hairline overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left bg-elevated hover:bg-hover transition-colors"
        aria-expanded={open}
      >
        <Activity className="h-4 w-4 shrink-0 text-subtle" />
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Hallazgos del examen
        </span>
        {hasAny && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Con datos
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="p-4 space-y-3 bg-surface border-t border-hairline">
          {/* Extraoral */}
          <SubSection title="Examen extraoral" defaultOpen={hasExtraoral}>
            {EXTRAORAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-subtle block mb-1">
                  {f.label}
                </label>
                <TextArea
                  rows={2}
                  placeholder={f.placeholder}
                  value={findings.extraoral?.[f.key] ?? ""}
                  onChange={(e) => onUpdateExtraoral(f.key, e.target.value)}
                  disabled={disabled}
                  className="text-xs min-h-[52px]"
                />
              </div>
            ))}
          </SubSection>

          {/* Intraoral */}
          <SubSection title="Examen intraoral" defaultOpen={hasIntraoral}>
            {INTRAORAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-subtle block mb-1">
                  {f.label}
                </label>
                <TextArea
                  rows={2}
                  placeholder={f.placeholder}
                  value={findings.intraoral?.[f.key] ?? ""}
                  onChange={(e) => onUpdateIntraoral(f.key, e.target.value)}
                  disabled={disabled}
                  className="text-xs min-h-[52px]"
                />
              </div>
            ))}
          </SubSection>
        </div>
      )}
    </div>
  );
}
