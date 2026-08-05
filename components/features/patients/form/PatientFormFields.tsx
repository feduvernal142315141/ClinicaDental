"use client";

import { useFormContext } from "react-hook-form";
import { localTodayInput } from "@/lib/datetime";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@/components/ui/atomic/forms";
import { Select } from "@/components/ui/controls/select";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { AvatarField } from "@/components/ui/controls/avatar-field";
import { imageUploadService } from "@/lib/services/cloudinary/cloudinary.service";
import type { PatientFormValues } from "@/lib/entity/patients";

const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

interface PatientFormFieldsProps {
  /** Deshabilita todos los campos (cargando o modo readOnly). */
  disabled?: boolean;
  /**
   * Muestra el control de estado activo/inactivo. Solo en EDICIÓN: en el alta
   * el paciente siempre nace activo y el campo no viaja al backend.
   */
  showStatus?: boolean;
}

/**
 * PatientFormFields — Campos reutilizables del formulario de paciente.
 *
 * Usa `useFormContext<PatientFormValues>()` y debe renderizarse dentro
 * de un `<Form {...form}>` que proporcione el contexto de react-hook-form.
 * No tiene lógica de submit ni chrome (Card, acciones). Bento puro.
 */
export function PatientFormFields({
  disabled = false,
  showStatus = false,
}: PatientFormFieldsProps) {
  const form = useFormContext<PatientFormValues>();
  const { errors } = form.formState;

  return (
    <div className="space-y-5">
      {/* Foto del paciente — MISMO control y MISMO servicio que el avatar del
          doctor (DoctorForm), sólo cambia la carpeta de Cloudinary.
          `size` reducido respecto al de doctores (180): allí ocupa una columna
          propia de 200px, mientras que aquí el formulario también se muestra
          dentro del modal de la historia clínica, donde 180 se comía la ficha. */}
      <div className="flex justify-center sm:justify-start">
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <AvatarField
              value={field.value ?? ""}
              onChange={field.onChange}
              disabled={disabled}
              size={112}
              uploader={(file) =>
                imageUploadService.uploadImage(file, "patients")
              }
            />
          )}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="lg:col-span-1 sm:col-span-2">
              <FormLabel>
                Nombre completo <span className="text-rose-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: María González López"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Correo */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Ej: maria@email.com"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Teléfono */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Teléfono <span className="text-rose-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: +505 8275-8275"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fecha de nacimiento */}
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Fecha de nacimiento <span className="text-rose-500">*</span>
              </FormLabel>
              <DateTimePicker
                value={field.value}
                onChange={field.onChange}
                showTime={false}
                max={localTodayInput()}
                toYear={new Date().getFullYear()}
                disabled={disabled}
                aria-label="Fecha de nacimiento"
                aria-invalid={!!errors.dateOfBirth}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Género */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Género <span className="text-rose-500">*</span>
              </FormLabel>
              <Select
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={GENDER_OPTIONS}
                placeholder="Seleccione género"
                disabled={disabled}
                aria-label="Género"
                aria-invalid={!!errors.gender}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dirección */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Calle Mayor 123, ..."
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Convenio */}
      <FormField
        control={form.control}
        name="agreement"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
            <div className="space-y-0.5">
              <FormLabel>Convenio</FormLabel>
              <p className="text-xs text-subtle">
                ¿El paciente cuenta con convenio?
              </p>
            </div>
            <FormControl>
              <Switch
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Estado — solo en edición */}
      {showStatus && (
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <FormLabel>Paciente activo</FormLabel>
                <p className="text-xs text-subtle">
                  {field.value
                    ? "Aparece en el listado y se le pueden agendar citas."
                    : "Queda inactivo: seguirá en el listado y conserva su historia clínica, pero se marca como no vigente."}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  aria-label="Paciente activo"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
