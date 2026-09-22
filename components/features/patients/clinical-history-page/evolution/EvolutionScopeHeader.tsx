"use client";

import { AlertTriangle, Loader2, Printer } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";

export interface EvolutionScopeHeaderProps {
  shownCount: number;
  truncated: boolean;
  onPrint?: () => void;
  printPreparing?: boolean;
  printProgress?: { loaded: number; total: number };
  onPrintSelection?: () => void;
  selectionCount?: number;
}
export function EvolutionScopeHeader({
  shownCount,
  truncated,
  onPrint,
  printPreparing = false,
  printProgress,
  onPrintSelection,
  selectionCount,
}: EvolutionScopeHeaderProps) {
  if (!truncated && !onPrint) return null;
  return (
    <div className="mb-2 flex flex-col gap-2">
      {onPrint ? (
        <div className="flex items-center justify-end">
          {onPrintSelection ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={printPreparing}
                  className="h-8 gap-1.5 px-2 text-xs text-subtle hover:text-ink"
                >
                  {printPreparing ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {printPreparing && printProgress
                    ? `Preparando… ${printProgress.loaded}/${printProgress.total}`
                    : "Imprimir"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPrint}>
                  Imprimir expediente completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrintSelection}>
                  Imprimir selección actual ({selectionCount ?? 0})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onPrint}
            disabled={printPreparing}
            aria-live="polite"
            title={
              shownCount === 1
                ? "Imprimir la consulta mostrada"
                : `Imprimir las ${shownCount} consultas mostradas`
            }
            className={cn(
              "h-8 shrink-0 gap-1.5 px-2 text-xs text-subtle hover:text-ink",
              "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-3",
            )}
          >
            {printPreparing ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {printPreparing && printProgress
              ? `Preparando… ${printProgress.loaded}/${printProgress.total}`
              : "Imprimir"}
          </Button>
          )}
        </div>
      ) : null}
      {truncated ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-400/25 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Se muestran las 100 consultas más recientes registradas; puede haber
            consultas anteriores no listadas.
          </span>
        </div>
      ) : null}
    </div>
  );
}
export default EvolutionScopeHeader;
