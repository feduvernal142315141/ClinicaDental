"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/primitives/shadcn/sheet";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/atomic/forms/form";
import { Input } from "@/components/ui/atomic/forms/input";
import { Select } from "@/components/ui/controls/select";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { cn } from "@/lib/utils/utils";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";


const MARITAL_STATUS_OPTIONS = [
  { label: "Soltero/a", value: "Soltero/a" },
  { label: "Casado/a", value: "Casado/a" },
  { label: "Divorciado/a", value: "Divorciado/a" },
  { label: "Viudo/a", value: "Viudo/a" },
  { label: "Unión libre", value: "Unión libre" },
];

const EMPTY_OPTION = { label: "Sin especificar", value: "" };

interface MedicalHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UpdateMedicalHistoryRequest) => Promise<void>;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  loading: boolean;
}

const formSchema = z.object({
  occupation: z.string().optional(),
  maritalStatus: z.string().optional(),
  systemicDiseases: z.array(z.string()),
  currentMedications: z.array(z.string()),
  allergies: z.array(z.string()),
  previousSurgeries: z.array(z.string()),
  habits: z.array(z.string()),
  lastDentalVisit: z.string().optional(),
});

type MedicalHistoryFormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: MedicalHistoryFormValues = {
  occupation: "",
  maritalStatus: "",
  systemicDiseases: [],
  currentMedications: [],
  allergies: [],
  previousSurgeries: [],
  habits: [],
  lastDentalVisit: "",
};

function toFormValues(
  mh: ClinicalHistoryMedicalHistory,
): MedicalHistoryFormValues {
  return {
    occupation: mh.occupation ?? "",
    maritalStatus: mh.maritalStatus ?? "",
    systemicDiseases: mh.systemicDiseases ?? [],
    currentMedications: mh.currentMedications ?? [],
    allergies: mh.allergies ?? [],
    previousSurgeries: mh.previousSurgeries ?? [],
    habits: mh.habits ?? [],
    // El picker Bento trabaja con strings 'YYYY-MM-DD'.
    lastDentalVisit: mh.lastDentalVisit ? mh.lastDentalVisit.slice(0, 10) : "",
  };
}

/**
 * Tag input libre (equivalente al `mode="tags"` de AntD): el usuario escribe y
 * confirma con Enter o coma; Backspace en vacío elimina el último; chips con X.
 * Controlado vía value/onChange. Tokens Bento.
 */
function TagInput({
  value,
  onChange,
  placeholder,
  id,
  onBlur,
  ariaInvalid,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  onBlur?: () => void;
  ariaInvalid?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const addToken = (raw: string) => {
    const token = raw.trim();
    setDraft("");
    if (!token || value.includes(token)) return;
    onChange([...value, token]);
  };

  const removeAt = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addToken(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  return (
    <div
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onBlur?.();
        }
      }}
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 rounded-xl border bg-elevated px-3 py-2 text-sm transition-colors",
        "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
        ariaInvalid ? "border-rose-500/60" : "border-hairline",
      )}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand"
        >
          {tag}
          <button
            type="button"
            aria-label={`Quitar ${tag}`}
            onClick={() => removeAt(i)}
            className="grid h-3.5 w-3.5 place-items-center rounded-sm hover:bg-brand/20"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) addToken(draft);
        }}
        placeholder={value.length === 0 ? placeholder : ""}
        aria-invalid={ariaInvalid}
        className="min-w-[8rem] flex-1 bg-transparent text-ink outline-none placeholder:text-subtle"
      />
    </div>
  );
}

export function MedicalHistoryDrawer({
  open,
  onClose,
  onSave,
  medicalHistory,
  loading,
}: MedicalHistoryDrawerProps) {
  const form = useForm<MedicalHistoryFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(medicalHistory ? toFormValues(medicalHistory) : EMPTY_VALUES);
    }
  }, [open, medicalHistory, form]);

  const onSubmit = async (values: MedicalHistoryFormValues) => {
    // Motivo de consulta y dolor actual son per-visita (PatientVisitRecord);
    // la anamnesis ya no los captura ni envía (fuente única de verdad).
    const data: UpdateMedicalHistoryRequest = {
      occupation: values.occupation,
      maritalStatus: values.maritalStatus,
      systemicDiseases: values.systemicDiseases ?? [],
      currentMedications: values.currentMedications ?? [],
      allergies: values.allergies ?? [],
      previousSurgeries: values.previousSurgeries ?? [],
      habits: values.habits ?? [],
      lastDentalVisit: values.lastDentalVisit || undefined,
    };
    await onSave(data);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-hairline bg-surface p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-hairline">
          <SheetTitle className="text-ink">
            {medicalHistory ? "Editar historia médica" : "Crear historia médica"}
          </SheetTitle>
          <SheetDescription className="text-subtle">
            {medicalHistory
              ? "Actualiza los antecedentes médicos del paciente."
              : "Registra los antecedentes médicos del paciente."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            autoComplete="off"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <FormField
                control={form.control}
                name="occupation"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Ocupación</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Ingeniero, Estudiante..."
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Estado civil</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={[EMPTY_OPTION, ...MARITAL_STATUS_OPTIONS]}
                      placeholder="Seleccionar"
                      aria-invalid={!!fieldState.error}
                      aria-label="Estado civil"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemicDiseases"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Enfermedades sistémicas</FormLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Escriba y presione Enter para agregar"
                      ariaInvalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentMedications"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Medicamentos actuales</FormLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Escriba y presione Enter para agregar"
                      ariaInvalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allergies"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Alergias</FormLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Escriba y presione Enter para agregar"
                      ariaInvalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previousSurgeries"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Cirugías previas</FormLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Escriba y presione Enter para agregar"
                      ariaInvalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="habits"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Hábitos</FormLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Ej: Bruxismo, Tabaquismo, Onicofagia..."
                      ariaInvalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastDentalVisit"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Última visita dental</FormLabel>
                    <DateTimePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      showTime={false}
                      aria-invalid={!!fieldState.error}
                      aria-label="Última visita dental"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-hairline">
              <Button
                type="button"
                variant="outline"
                danger
                icon={<X className="h-4 w-4" />}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                loading={loading}
                icon={<Save className="h-4 w-4" />}
              >
                Guardar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
