"use client";

import dynamic from "next/dynamic";
import { useFormContext, useWatch } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/atomic/forms";
import { Select } from "@/components/ui/controls/select";
import { TOOTH_NOTATION_SELECT_OPTIONS } from "@/components/features/settings/odontogram-select-options";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";
import { Req } from "@/components/features/settings/clinic-info-fields";

function PreviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando previsualización del odontograma"
      className="h-56 w-full animate-pulse rounded-xl bg-hover"
    />
  );
}

const OdontogramNotationPreview = dynamic(
  () =>
    import("@/components/features/settings/odontogram-notation-preview").then(
      (mod) => mod.OdontogramNotationPreview,
    ),
  { ssr: false, loading: () => <PreviewSkeleton /> },
);

interface OdontogramFieldsProps {
  disabled?: boolean;
}

export function OdontogramFields({ disabled = false }: OdontogramFieldsProps) {
  const { control } = useFormContext<GeneralSettingsFormValues>();
  const notation = useWatch({ control, name: "toothNotation" });

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={control}
          name="toothNotation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nomenclatura dental <Req />
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={TOOTH_NOTATION_SELECT_OPTIONS}
                  placeholder="Seleccione nomenclatura…"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <p className="text-xs text-subtle">
        Cambia sólo cómo se leen las piezas en pantalla e impresos. Lo ya
        registrado no se modifica: internamente cada pieza se guarda siempre en
        FDI/ISO 3950.
      </p>

      <div className="h-px bg-hairline" />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">Previsualización</h4>
        <p className="text-sm text-subtle">
          Así se numerará la carta dental con la nomenclatura seleccionada.
        </p>
        <OdontogramNotationPreview notation={notation} />
      </div>
    </div>
  );
}
