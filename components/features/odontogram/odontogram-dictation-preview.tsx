"use client";

import { useId, useMemo } from "react";
import { AlertTriangle, Check, CircleHelp, ListChecks, X } from "lucide-react";
import { Checkbox } from "@/components/ui";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { cn } from "@/lib/odontogram/utils";
import type {
  OdontogramDictationOperationDescription,
  OdontogramDictationToothGroup,
} from "@/lib/odontogram/application/dictation";
import type { OdontogramDictationPreviewState } from "./odontogram-dictation-session";

interface OdontogramDictationPreviewPanelProps {
  preview: OdontogramDictationPreviewState;
  /**
   * Sufijo de los `id` de casillas y descripciones. Las dos superficies del
   * dictado nunca están montadas a la vez, pero el prefijo evita que un
   * solapamiento momentáneo duplique un `id` y rompa el `htmlFor`.
   */
  idPrefix: string;
  /**
   * Dentro del modal del diente el alto es escaso: la lista se acorta y los
   * fragmentos se recortan a dos líneas. La información no cambia, solo cabe.
   */
  compact?: boolean;
  /** Histórico, visita finalizada o sin permiso: se puede leer, no aplicar. */
  readOnly: boolean;
  onToggleOperation: (sequence: number, selected: boolean) => void;
  onToggleTooth: (toothNumber: number, selected: boolean) => void;
  /** Quita de la selección lo que se bloqueó con el panel ya abierto. */
  onUnselectBlocked: () => void;
  onApply: () => void;
  onDiscard: () => void;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/**
 * Previsualización OBLIGATORIA de un dictado antes de tocar el odontograma
 * (HU-DICT-032, reglas 1–3 y 7 de «Reglas para el frontend» en
 * `ODONTOGRAM_DICTATION_API.md`).
 *
 * Por qué existe: el micrófono está abierto en el box y la voz NO se puede
 * autenticar. Lo que dijo el paciente, la asistente o quien pasaba por el
 * pasillo llega al transcript igual que lo que dijo el doctor. Nada puede
 * escribirse en una historia clínica sin que alguien lo lea y lo marque, y por
 * eso cada fila enseña el fragmento que la originó: reconocer una voz ajena es
 * lo único que permite descartarla.
 *
 * La revisión es POR OPERACIÓN: se puede aceptar el lote, descartarlo entero o
 * quitar una instrucción suelta. Este panel ES la confirmación del dictado; no
 * se apila ningún diálogo encima.
 *
 * Es una revisión VIVA: el modal del diente sigue operativo debajo, así que lo
 * aplicable puede cambiar mientras se revisa. Cuando eso pasa, la instrucción
 * afectada se señala aquí con su motivo en vez de descubrirse al aplicar.
 */
export function OdontogramDictationPreviewPanel({
  preview,
  idPrefix,
  compact = false,
  readOnly,
  onToggleOperation,
  onToggleTooth,
  onUnselectBlocked,
  onApply,
  onDiscard,
}: OdontogramDictationPreviewPanelProps) {
  const reactId = useId();
  const titleId = `${idPrefix}-dictation-preview-title${reactId}`;
  const { description, selected, blockers } = preview;

  const {
    selectedCount,
    selectedDestructive,
    blockedSelectedCount,
    pendingConfirmationCount,
  } = useMemo(() => {
    let count = 0;
    let destructive = 0;
    let blockedSelected = 0;
    let pendingConfirmation = 0;
    description.operations.forEach((operation) => {
      const isBlocked = blockers.has(operation.sequence);
      if (!selected.has(operation.sequence)) {
        // Solo cuenta como «pendiente de confirmar» lo que el doctor todavía
        // podría marcar: lo bloqueado ya se cuenta por su propio motivo.
        if (operation.requiresConfirmation && !isBlocked) {
          pendingConfirmation += 1;
        }
        return;
      }
      count += 1;
      if (operation.destructive) destructive += 1;
      if (isBlocked) blockedSelected += 1;
    });
    return {
      selectedCount: count,
      selectedDestructive: destructive,
      blockedSelectedCount: blockedSelected,
      pendingConfirmationCount: pendingConfirmation,
    };
  }, [blockers, description.operations, selected]);

  const total = description.totalOperations;
  const teethCount = description.groups.length;
  // Bloqueadas que el doctor NO tiene marcadas: informan, no impiden aplicar.
  const blockedUnselectedCount = blockers.size - blockedSelectedCount;
  // Aplicar con una bloqueada marcada tumbaría el lote entero (regla 11): se
  // impide aquí y se explica, en vez de dejar que falle al escribir.
  const applyBlocked = blockedSelectedCount > 0;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-lg border border-brand/40 bg-brand/5 p-3"
    >
      <header className="flex items-start gap-2">
        <ListChecks aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-sm font-semibold text-ink">
            Dictado interpretado · {total} {plural(total, "cambio", "cambios")}{" "}
            en {teethCount} {plural(teethCount, "pieza", "piezas")}
          </h3>
          {/* Único resumen vivo del panel: cambia cuando el doctor marca o
              desmarca, que es justo lo que necesita oír quien usa lector. */}
          <p
            role="status"
            aria-live="polite"
            className="mt-0.5 text-xs text-subtle"
          >
            {selectedCount === 0
              ? "No hay ningún cambio marcado. Nada se aplicará."
              : applyBlocked
                ? `${selectedCount} de ${total} ${plural(
                    total,
                    "cambio marcado",
                    "cambios marcados",
                  )}, pero ${blockedSelectedCount} ya no ${
                    blockedSelectedCount === 1 ? "se puede" : "se pueden"
                  } aplicar.`
                : `${selectedCount} de ${total} ${plural(
                    total,
                    "cambio marcado",
                    "cambios marcados",
                  )} para aplicar.`}
            {" Revisa la frase de cada instrucción antes de aplicar: el micrófono también escucha al paciente."}
          </p>
        </div>
        <OdontogramButton
          variant="ghost"
          size="sm"
          aria-label="Descartar el dictado sin aplicar nada"
          icon={<X aria-hidden className="h-4 w-4" />}
          onClick={onDiscard}
        />
      </header>

      <div
        className={cn(
          "space-y-2 overflow-y-auto pr-1",
          compact ? "max-h-44" : "max-h-[22rem]",
        )}
      >
        {description.groups.map((group) => (
          <ToothGroupCard
            key={group.toothNumber}
            group={group}
            idPrefix={idPrefix}
            reactId={reactId}
            compact={compact}
            readOnly={readOnly}
            selected={selected}
            blockers={blockers}
            onToggleOperation={onToggleOperation}
            onToggleTooth={onToggleTooth}
          />
        ))}
      </div>

      {/* Bloqueo SOBREVENIDO: estaba marcada y dejó de ser aplicable porque el
          odontograma cambió debajo del panel. Es el único caso que impide
          aplicar, así que trae su propia salida a un clic. */}
      {applyBlocked && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-1.5 rounded-md bg-rose-50/70 px-2.5 py-2 text-xs text-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
        >
          <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p>
              {blockedSelectedCount === 1
                ? "1 cambio que tenías marcado ya no se puede aplicar: el odontograma cambió mientras revisabas."
                : `${blockedSelectedCount} cambios que tenías marcados ya no se pueden aplicar: el odontograma cambió mientras revisabas.`}{" "}
              Están señalados abajo con su motivo. Desmárcalos y podrás aplicar
              el resto.
            </p>
            <OdontogramButton
              size="sm"
              variant="outline"
              disabled={readOnly}
              onClick={onUnselectBlocked}
            >
              {blockedSelectedCount === 1
                ? "Desmarcar el cambio bloqueado"
                : `Desmarcar los ${blockedSelectedCount} cambios bloqueados`}
            </OdontogramButton>
          </div>
        </div>
      )}

      {blockedUnselectedCount > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50/70 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {blockedUnselectedCount === 1
              ? "Hay 1 instrucción que no se puede aplicar sobre el odontograma actual; queda fuera de la selección."
              : `Hay ${blockedUnselectedCount} instrucciones que no se pueden aplicar sobre el odontograma actual; quedan fuera de la selección.`}{" "}
            Corrígelas a mano o vuelve a dictarlas con otras palabras.
          </span>
        </p>
      )}

      {/* Regla 4 del contrato: lo que la IA no da por seguro no se aplica por
          un clic global. Nace sin marcar y se dice por qué. */}
      {pendingConfirmationCount > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50/70 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <CircleHelp aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {pendingConfirmationCount === 1
              ? "1 instrucción nace sin marcar porque la IA no la da por segura: márcala tú si es lo que dictaste; si la dejas fuera, no se escribirá."
              : `${pendingConfirmationCount} instrucciones nacen sin marcar porque la IA no las da por seguras: márcalas una a una si son lo que dictaste; las que dejes fuera no se escribirán.`}
          </span>
        </p>
      )}

      {selectedDestructive > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-rose-50/70 px-2.5 py-2 text-xs text-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {selectedDestructive === 1
              ? "1 de los cambios marcados borra algo ya registrado en esta pieza."
              : `${selectedDestructive} de los cambios marcados borran datos ya registrados.`}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <OdontogramButton variant="outline" size="sm" onClick={onDiscard}>
          Descartar
        </OdontogramButton>
        <OdontogramButton
          size="sm"
          // En rojo cuando lo marcado incluye un borrado: aplicar deja de ser
          // solo añadir información.
          variant={selectedDestructive > 0 ? "destructive" : "primary"}
          icon={<Check aria-hidden className="h-4 w-4" />}
          disabled={readOnly || selectedCount === 0 || applyBlocked}
          title={
            applyBlocked
              ? "Desmarca los cambios bloqueados para poder aplicar el resto"
              : undefined
          }
          onClick={onApply}
        >
          {selectedCount === 0
            ? "Aplicar"
            : `Aplicar ${selectedCount} ${plural(
                selectedCount,
                "cambio",
                "cambios",
              )}`}
        </OdontogramButton>
      </div>
    </section>
  );
}

interface ToothGroupCardProps {
  group: OdontogramDictationToothGroup;
  idPrefix: string;
  reactId: string;
  compact: boolean;
  readOnly: boolean;
  selected: ReadonlySet<number>;
  blockers: ReadonlyMap<number, string>;
  onToggleOperation: (sequence: number, selected: boolean) => void;
  onToggleTooth: (toothNumber: number, selected: boolean) => void;
}

/**
 * Un grupo por pieza (regla 3). Las operaciones conservan el orden GLOBAL de
 * `sequence` (regla 2): el número visible es ese `sequence`, para que el doctor
 * pueda seguir el orden en el que dictó aunque el panel agrupe.
 */
function ToothGroupCard({
  group,
  idPrefix,
  reactId,
  compact,
  readOnly,
  selected,
  blockers,
  onToggleOperation,
  onToggleTooth,
}: ToothGroupCardProps) {
  const groupId = `${idPrefix}-dictation-tooth-${group.toothNumber}${reactId}`;
  // La casilla de la pieza solo gobierna lo APROBABLE EN BLOQUE: ni lo
  // bloqueado (no es aplicable) ni lo que la IA no da por seguro (necesita un
  // gesto sobre esa fila). Así el estado que enseña es exactamente lo que hace
  // al pulsarla, en vez de quedarse indeterminada tras marcarla.
  const bulkSelectable = group.operations.filter(
    (operation) =>
      !blockers.has(operation.sequence) && !operation.requiresConfirmation,
  );
  const needsConfirmationCount = group.operations.filter(
    (operation) =>
      operation.requiresConfirmation && !blockers.has(operation.sequence),
  ).length;
  const selectedInGroup = bulkSelectable.filter((operation) =>
    selected.has(operation.sequence),
  ).length;
  const groupState =
    selectedInGroup === 0
      ? false
      : selectedInGroup === bulkSelectable.length
        ? true
        : "indeterminate";

  return (
    <div className="rounded-md border border-hairline bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-hairline px-2.5 py-1.5">
        <Checkbox
          id={groupId}
          checked={groupState}
          disabled={readOnly || bulkSelectable.length === 0}
          onCheckedChange={(state) =>
            onToggleTooth(group.toothNumber, state === true)
          }
        />
        <label
          htmlFor={groupId}
          className="cursor-pointer select-none text-xs font-semibold text-ink"
        >
          Pieza {group.toothNumber}
        </label>
        <span className="text-xs text-subtle">
          {group.operations.length}{" "}
          {plural(group.operations.length, "cambio", "cambios")}
        </span>
        {needsConfirmationCount > 0 && (
          <span className="text-xs text-amber-800 dark:text-amber-200">
            · {needsConfirmationCount} por confirmar aparte
          </span>
        )}
      </div>

      <ul className="divide-y divide-hairline">
        {group.operations.map((operation, index) => (
          <OperationRow
            key={operation.sequence}
            operation={operation}
            // El fragmento solo se repite cuando cambia: si dos filas salen de
            // la misma frase se dice explícitamente, para que separarlas sea
            // algo que se VE y no algo que pasa sin querer.
            repeatsPreviousSource={
              index > 0 &&
              operation.sourceText.trim().length > 0 &&
              operation.sourceText === group.operations[index - 1].sourceText
            }
            idPrefix={idPrefix}
            reactId={reactId}
            compact={compact}
            readOnly={readOnly}
            checked={selected.has(operation.sequence)}
            blocker={blockers.get(operation.sequence)}
            onToggle={onToggleOperation}
          />
        ))}
      </ul>
    </div>
  );
}

interface OperationRowProps {
  operation: OdontogramDictationOperationDescription;
  repeatsPreviousSource: boolean;
  idPrefix: string;
  reactId: string;
  compact: boolean;
  readOnly: boolean;
  checked: boolean;
  blocker?: string;
  onToggle: (sequence: number, selected: boolean) => void;
}

function OperationRow({
  operation,
  repeatsPreviousSource,
  idPrefix,
  reactId,
  compact,
  readOnly,
  checked,
  blocker,
  onToggle,
}: OperationRowProps) {
  const rowId = `${idPrefix}-dictation-op-${operation.sequence}${reactId}`;
  const detailsId = `${rowId}-detail`;
  const isBlocked = blocker !== undefined;
  /**
   * Se bloqueó DESPUÉS de que el doctor la marcara (el odontograma cambió con
   * el panel abierto). No se puede aplicar, pero tampoco se puede congelar:
   * tiene que poder desmarcarla para aplicar el resto del lote.
   */
  const isBlockedAfterSelecting = isBlocked && checked;
  /** La IA no la da por segura y sigue sin marcar: falta el gesto del doctor. */
  const awaitsConfirmation = operation.requiresConfirmation && !checked && !isBlocked;

  // El primer detalle repite el titular en los hallazgos de superficie
  // ("Caries" + "Caries en O"): se omite el chip redundante, no el dato.
  const chips = operation.details.filter(
    (detail) => !operation.summary.startsWith(detail),
  );

  return (
    <li
      className={cn(
        "px-2.5 py-2",
        isBlockedAfterSelecting &&
          "bg-rose-50/70 ring-1 ring-inset ring-rose-300 dark:bg-rose-950/25 dark:ring-rose-800",
        isBlocked && !checked && "bg-amber-50/60 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          id={rowId}
          className="mt-0.5"
          checked={checked}
          // Aprobar algo inaplicable tumbaría el lote entero al aplicar: se
          // muestra con su motivo, pero no se puede MARCAR. Si el bloqueo llegó
          // después de marcarla, la casilla sigue viva para poder DESmarcarla:
          // congelarla dejaría al doctor sin forma de aplicar el resto.
          disabled={readOnly || (isBlocked && !checked)}
          aria-describedby={detailsId}
          onCheckedChange={(state) => onToggle(operation.sequence, state === true)}
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={rowId}
            className={cn(
              "flex select-none flex-wrap items-baseline gap-x-1.5 text-xs",
              readOnly || (isBlocked && !checked)
                ? "cursor-not-allowed"
                : "cursor-pointer",
            )}
          >
            <span className="font-semibold tabular-nums text-subtle">
              {operation.sequence}.
            </span>
            <span
              className={cn(
                "font-medium",
                operation.destructive
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-ink",
              )}
            >
              {operation.summary}
            </span>
          </label>

          <div id={detailsId} className="mt-1 space-y-1">
            {(operation.destructive ||
              chips.length > 0 ||
              operation.requiresConfirmation) && (
              <div className="flex flex-wrap items-center gap-1">
                {operation.destructive && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                    {operation.actionLabel}
                  </span>
                )}
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-subtle"
                  >
                    {chip}
                  </span>
                ))}
                {operation.requiresConfirmation && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                    {checked
                      ? `Confirmado por ti · la IA pedía revisarlo (${Math.round(
                          operation.confidence * 100,
                        )} %)`
                      : `La IA pide confirmarlo (${Math.round(
                          operation.confidence * 100,
                        )} %)`}
                  </span>
                )}
              </div>
            )}

            {operation.sourceText.trim().length > 0 &&
              (repeatsPreviousSource ? (
                <p className="text-[11px] italic text-subtle">
                  De la misma frase que la instrucción anterior.
                </p>
              ) : (
                <p
                  className={cn(
                    "text-[11px] italic text-subtle",
                    compact && "line-clamp-2",
                  )}
                >
                  Se escuchó: “{operation.sourceText.trim()}”
                </p>
              ))}

            {awaitsConfirmation && (
              <p className="flex items-start gap-1 text-[11px] text-amber-800 dark:text-amber-200">
                <CircleHelp aria-hidden className="mt-px h-3 w-3 shrink-0" />
                <span>
                  Sin marcar: la IA no da esta instrucción por segura. Márcala
                  solo si es exactamente lo que dictaste.
                </span>
              </p>
            )}

            {isBlocked && (
              <p
                className={cn(
                  "flex items-start gap-1 text-[11px]",
                  isBlockedAfterSelecting
                    ? "font-medium text-rose-800 dark:text-rose-200"
                    : "text-amber-800 dark:text-amber-200",
                )}
              >
                <AlertTriangle aria-hidden className="mt-px h-3 w-3 shrink-0" />
                <span>
                  {isBlockedAfterSelecting
                    ? `Ya no se puede aplicar: ${blocker} Desmárcala para aplicar el resto.`
                    : blocker}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
