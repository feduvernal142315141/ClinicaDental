"use client";

import dynamic from "next/dynamic";
import { useWatch, type Control } from "react-hook-form";

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

/** Esqueleto del alto aproximado de la carta, para que no salte el layout. */
function PreviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando previsualización del odontograma"
      className="h-56 w-full animate-pulse rounded-xl bg-hover"
    />
  );
}

/**
 * La previsualización arrastra los datos SVG de las 32 piezas (~262 KB): se
 * carga en el cliente y bajo demanda. `ssr: false` es DELIBERADO aquí —no es
 * el caso de `app/(authenticated)/settings/general/page.tsx`, que usa
 * `dynamic` sin desactivar SSR—: el peso no debe entrar en el render de
 * servidor de una pantalla de configuración.
 */
const OdontogramNotationPreview = dynamic(
  () =>
    import("@/components/features/settings/odontogram-notation-preview").then(
      (mod) => mod.OdontogramNotationPreview,
    ),
  { ssr: false, loading: () => <PreviewSkeleton /> },
);

interface OdontogramFieldsProps {
  control: Control<GeneralSettingsFormValues>;
  disabled?: boolean;
}

/**
 * OdontogramFields — nomenclatura dental de la clínica.
 *
 * El Select elige la notación y la previsualización renumera EN VIVO (antes de
 * guardar) leyendo el valor con `useWatch`: ese es el sentido de la pantalla,
 * que la doctora compruebe cómo va a leer la carta antes de confirmar.
 *
 * Sólo cambia lo que se LEE: el dato guardado sigue siendo FDI/ISO 3950.
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre.
 */
export function OdontogramFields({
  control,
  disabled = false,
}: OdontogramFieldsProps) {
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
