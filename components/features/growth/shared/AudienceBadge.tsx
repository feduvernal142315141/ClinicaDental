import { UserSearch, Users } from "lucide-react";
import { SEGMENT_AUDIENCE_LABELS, segmentAudience } from "@/lib/entity/growth";
import { cn } from "@/lib/utils/utils";

/** Audience of a segment or campaign, with icon and text (never color alone). */
export function AudienceBadge({
  audience,
  className,
}: {
  audience: string | null | undefined;
  className?: string;
}) {
  const value = segmentAudience(audience);
  const Icon = value === "LEAD" ? UserSearch : Users;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1",
        value === "LEAD"
          ? "bg-brand/10 text-brand ring-brand/20"
          : "bg-hover text-subtle ring-hairline",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {SEGMENT_AUDIENCE_LABELS[value]}
    </span>
  );
}
