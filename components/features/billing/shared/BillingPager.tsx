import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import type { BillingPagination } from "@/lib/entity/billing";

interface BillingPagerProps {
  pagination: BillingPagination | undefined;
  onPageChange: (page: number) => void;
  /** "recibos", "pagos"… */
  noun: string;
}

/** Paginación base 0 del backend: "Página 1 de 4 · 37 recibos". */
export function BillingPager({ pagination, onPageChange, noun }: BillingPagerProps) {
  if (!pagination || pagination.total <= pagination.pageSize) return null;
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const { page } = pagination;

  return (
    <nav aria-label={`Paginación de ${noun}`} className="flex items-center justify-between gap-3 pt-3 text-sm">
      <span className="text-subtle tabular-nums">
        {pagination.total} {noun}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums text-ink">
          Página {page + 1} de {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= pages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
