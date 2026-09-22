"use client";

import { ChevronDown, Smile } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  DEFAULT_DENTITION,
  DENTITION_CATALOG,
  isDentitionType,
  teethFor,
  type DentitionType,
} from "@/lib/odontogram/domain/odontogram/constants/dentition.constants";
import { useOdontogramStore } from "@/lib/odontogram/store";
import { notify } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/utils";

interface DentitionSwitchProps {
  className?: string;
}

/**
 * Dentición del odontograma como propiedad editable sobre su valor: la píldora
 * muestra la dentición vigente y ella misma abre el selector. Todo sale del
 * store, sin props del host.
 */
export function DentitionSwitch({ className }: DentitionSwitchProps) {
  const dentition = useOdontogramStore((state) => state.dentition);
  const readOnly = useOdontogramStore((state) => state.readOnly);
  const clinicalEvents = useOdontogramStore((state) => state.clinicalEvents);
  const setDentition = useOdontogramStore((state) => state.setDentition);

  const current =
    DENTITION_CATALOG.find((entry) => entry.value === dentition) ??
    DENTITION_CATALOG.find((entry) => entry.value === DEFAULT_DENTITION)!;

  // Piezas con registros que la dentición destino no dibuja: se avisa en el
  // momento del cambio, no se pierde nada.
  const hiddenCountFor = (next: DentitionType) => {
    const visible = new Set(teethFor(next));
    return new Set(
      clinicalEvents
        .filter((event) => !visible.has(event.toothNumber))
        .map((event) => event.toothNumber),
    ).size;
  };

  const handleChange = (next: string) => {
    if (!isDentitionType(next) || next === dentition) return;
    const entry = DENTITION_CATALOG.find((item) => item.value === next);
    if (!entry) return;
    const hidden = hiddenCountFor(next);
    setDentition(next);
    notify.success(`Odontograma en ${entry.label.toLowerCase()}`, {
      description:
        hidden === 0
          ? `${entry.description}. ${entry.ageHint}.`
          : hidden === 1
            ? "1 pieza con registros no se muestra en esta dentición; sus datos se conservan."
            : `${hidden} piezas con registros no se muestran en esta dentición; sus datos se conservan.`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={readOnly}
          aria-label={`Cambiar dentición del odontograma: ${current.label}`}
          title="Cambiar la dentición que muestra el odontograma"
          className={cn(
            "group flex touch-manipulation items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all hover:shadow-xl",
            "outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            "border-border/70 bg-surface/90 text-ink opacity-90 hover:bg-surface hover:opacity-100",
            "data-[state=open]:border-brand data-[state=open]:bg-brand data-[state=open]:text-white data-[state=open]:shadow-brand/20",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:bg-surface/90",
            className,
          )}
        >
          <Smile
            aria-hidden="true"
            className="h-4 w-4 text-brand transition-transform group-hover:scale-110 group-data-[state=open]:text-white"
          />
          <span>{current.label}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-white"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="start" className="w-64">
        <DropdownMenuRadioGroup value={dentition} onValueChange={handleChange}>
          {DENTITION_CATALOG.map((entry) => (
            <DropdownMenuRadioItem
              key={entry.value}
              value={entry.value}
              className="flex-col items-start gap-0.5"
            >
              <span>{entry.label}</span>
              <span className="text-xs text-subtle">
                {entry.description} · {entry.ageHint}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
