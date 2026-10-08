"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui";
import {
  SEGMENT_LEAD_ELIGIBILITY_HELP,
  SEGMENT_RECIPIENTS_HIDDEN_MESSAGE,
  audienceCountLabel,
  excludedWithoutNameMessage,
  segmentAudience,
  type SegmentEvaluationResult,
} from "@/lib/entity/growth";
import { useLeadAccess } from "@/lib/hooks/leads";

interface SegmentPreviewProps {
  evaluation: SegmentEvaluationResult;
  /** Audience of the segment, used when the evaluation does not say it. */
  audience?: string | null;
  className?: string;
}

/**
 * Result of evaluating a segment: how many people a campaign would reach and the first ones.
 * The numbers come from the backend as they are; nothing is filtered or recounted here.
 */
export function SegmentPreview({ evaluation, audience, className }: SegmentPreviewProps) {
  const { visible: canOpenLeads } = useLeadAccess();
  const resolved = segmentAudience(evaluation.audience ?? audience);
  const isLead = resolved === "LEAD";
  const people = evaluation.preview ?? [];
  const withoutName = evaluation.excludedWithoutName ?? 0;

  return (
    <div className={className} aria-live="polite">
      <p className="text-sm text-ink">
        <strong className="tabular-nums">{audienceCountLabel(resolved, evaluation.count)}</strong>{" "}
        {evaluation.count === 1 ? "cumple" : "cumplen"} este segmento
      </p>

      {isLead && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {SEGMENT_LEAD_ELIGIBILITY_HELP}
        </p>
      )}

      {isLead && withoutName > 0 && (
        <Alert className="mt-3">
          <AlertDescription>{excludedWithoutNameMessage(withoutName)}</AlertDescription>
        </Alert>
      )}

      {evaluation.recipientsHidden ? (
        <p className="mt-3 rounded-lg bg-hover px-3 py-2 text-sm text-subtle">{SEGMENT_RECIPIENTS_HIDDEN_MESSAGE}</p>
      ) : (
        people.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-subtle">
              {people.length < evaluation.count ? `Primeros ${people.length}` : "Quiénes son"}
            </p>
            <ul className="mt-1 divide-y divide-hairline rounded-lg border border-hairline">
              {people.map((person, index) => {
                const key = person.leadId ?? person.patientId ?? `${person.phone}-${index}`;
                const title = person.name?.trim() || person.phone;
                return (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
                    <span className="min-w-0 break-words font-medium text-ink">
                      {person.leadId && canOpenLeads ? (
                        <Link href={`/leads/${person.leadId}`} className="underline-offset-2 hover:underline">
                          {title}
                        </Link>
                      ) : (
                        title
                      )}
                      {isLead && !person.name?.trim() && (
                        <span className="ml-2 text-xs font-normal text-subtle">Sin nombre</span>
                      )}
                    </span>
                    {person.name?.trim() && <span className="tabular-nums text-subtle">{person.phone}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
