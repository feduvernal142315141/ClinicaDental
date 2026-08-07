"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Layers3 } from "lucide-react";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import type { TreatmentPlanItem, UpdatePlanItemRequest } from "@/lib/entity/odontogram";

interface PlanItemPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TreatmentPlanItem;
  /** Fases que YA existen en el plan, para no inventar una numeración paralela. */
  usedPhases: number[];
  onSubmit: (changes: UpdatePlanItemRequest) => Promise<boolean>;
}

/**
 * Opciones del desplegable: las fases que el plan ya usa, más UNA nueva al final.
 *
 * Ofrecer un rango fijo (1…6) inventaría un tope que el backend no tiene y
 * llenaría la lista de fases vacías; dejar solo las existentes impediría abrir la
 * primera. Con "las de siempre + la siguiente" se numera en orden y sin huecos,
 * que es como se lee un plan por fases.
 */
function buildPhaseOptions(
  usedPhases: number[],
  currentPhase: number | null | undefined,
): SelectOption[] {
  const phases = new Set(usedPhases.filter((phase) => Number.isFinite(phase)));
  if (typeof currentPhase === "number") phases.add(currentPhase);

  const ordered = Array.from(phases).sort((a, b) => a - b);
  const next = (ordered[ordered.length - 1] ?? 0) + 1;

  return [
    ...ordered.map<SelectOption>((phase) => ({
      value: String(phase),
      label: `Fase ${phase}`,
    })),
    { value: String(next), label: `Fase ${next}`, description: "Fase nueva" },
  ];
}

/**
 * PlanItemPhaseDialog
 *
 * Asigna la fase de UNA línea. Manda solo `phase` (el PATCH es null-aware).
 *
 * No es un formulario con react-hook-form + zod a propósito: no hay texto libre
 * ni nada que validar — el valor sale de una lista cerrada que este componente
 * construye, así que un esquema solo repetiría lo que el propio control ya
 * garantiza.
 *
 * Lo que NO se puede hacer aquí es DEJAR una línea sin fase: `null` significa "no
 * tocar" en el contrato del PATCH, así que no hay forma de borrarla. Se dice en
 * pantalla en vez de ofrecer un "Sin fase" que no haría nada.
 */
export function PlanItemPhaseDialog({
  open,
  onOpenChange,
  item,
  usedPhases,
  onSubmit,
}: PlanItemPhaseDialogProps) {
  const selectId = useId();
  const options = useMemo(
    () => buildPhaseOptions(usedPhases, item.phase),
    [usedPhases, item.phase],
  );

  const currentValue =
    typeof item.phase === "number" ? String(item.phase) : options[0].value;
  const [value, setValue] = useState(currentValue);
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(false);

  // Cada APERTURA parte de la fase guardada: el diálogo vive montado con la fila
  // y, sin esto, reabrirlo tras cancelar mostraría la elección descartada.
  //
  // Solo en la transición cerrado→abierto: la fila se recarga sola tras
  // cualquier mutación de la tabla, y reaccionar a eso con el diálogo abierto
  // tiraría la fase que el usuario estaba a punto de guardar.
  useEffect(() => {
    if (open && !wasOpenRef.current) setValue(currentValue);
    wasOpenRef.current = open;
  }, [open, currentValue]);

  const unchanged = value === currentValue && typeof item.phase === "number";

  const handleSubmit = async () => {
    const phase = Number(value);
    if (!Number.isFinite(phase) || phase < 1 || submitting) return;

    setSubmitting(true);
    const saved = await onSubmit({ phase });
    setSubmitting(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={<Layers3 className="h-5 w-5" />}
      title="Cambiar de fase"
      description={item.serviceName}
      // El popover del `Select` compartido NO se portaliza: se posiciona
      // `absolute` dentro del propio control (controls/select.tsx:319-320) y,
      // al estar fuera de flujo, no aporta altura al diálogo. El
      // `DialogContent` del Modal recorta con `overflow-hidden`
      // (custom/Modal.tsx:45), así que con tres o más fases en uso la lista se
      // sale por debajo del borde y las últimas filas —entre ellas «Fase
      // nueva», que es la razón de ser de este diálogo— ni se ven ni se pueden
      // pulsar. El `max-h-64 overflow-auto` del `<ul>` no salva nada: quien
      // recorta es el diálogo desde fuera.
      //
      // `overflow-visible` gana por tailwind-merge (mismo grupo `overflow`) y
      // no rompe el `rounded-2xl`: el único fondo del diálogo es el del propio
      // `DialogContent`, y la esquina redondeada sigue recortándolo.
      className="overflow-visible"
    >
      <div className="space-y-2 px-6 pb-6">
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          Fase del plan
        </label>
        <Select
          id={selectId}
          value={value}
          onChange={setValue}
          options={options}
          className="w-full"
        />
        <p className="text-xs text-subtle">
          Las fases ordenan el plan por tandas de tratamiento. Una vez asignada no
          se puede dejar la línea sin fase: solo moverla a otra.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || unchanged}
        >
          {submitting ? "Guardando…" : "Guardar fase"}
        </Button>
      </div>
    </Modal>
  );
}
