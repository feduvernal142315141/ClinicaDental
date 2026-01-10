"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  agreementOptions,
  genderOptions,
  Patient,
} from "@/lib/entity/patients/patients";
import { createPatient, updatePatient } from "@/lib/supabase/patients";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TextField } from "@/components/ui/primitives/custom/TextField";
import { FormSelect } from "@/components/ui/primitives/custom/FormSelect";
import { DatePickerField } from "@/components/ui/primitives/custom/DatePickerField";

interface PatientFormProps {
  patient: Patient | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("El email no es válido"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  dateOfBirth: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  address: z.string().optional(),
  gender: z.string().min(1, "El género es obligatorio"),
  agreement: z.string().min(1, "El convenio es obligatorio"),
});

export function PatientForm({
  patient,
  onSuccess,
  onCancel,
}: PatientFormProps) {
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: patient?.name || "",
      email: patient?.email || "",
      phone: patient?.phone || "",
      dateOfBirth: patient?.dateOfBirth || "",
      address: patient?.address || "",
      gender: patient?.gender || "",
      agreement: patient?.agreement ? "1" : "2",
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (patient) {
        await updatePatient(patient.id, {
          ...values,
          agreement: values.agreement === "1",
        });
      } else {
        await createPatient({
          ...values,
          clinic_id: user?.clinicId ?? "",
          agreement: values.agreement === "1",
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving patient:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <p className="text-muted-foreground">
          {patient
            ? "Modifica la información del paciente"
            : "Registra un nuevo paciente en el sistema"}
        </p>
      </div>

      {/* Card */}
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Información del Paciente</CardTitle>
          <CardDescription>
            Completa todos los campos obligatorios para{" "}
            {patient ? "actualizar" : "registrar"} el paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
              <TextField
                name="name"
                control={control}
                label="Nombre Completo"
                placeholder="Ej: María González López"
                required
                error={errors.name?.message}
              />

              <TextField
                name="email"
                control={control}
                type="email"
                label="Correo Electrónico"
                placeholder="Ej: maria@email.com"
                required
                error={errors.email?.message}
              />

              <TextField
                name="phone"
                control={control}
                label="Teléfono"
                placeholder="Ej: +505 8275-8275"
                required
                error={errors.phone?.message}
              />

              <DatePickerField
                name="dateOfBirth"
                control={control}
                label="Fecha de Nacimiento"
                required
                error={errors.dateOfBirth?.message}
              />

              <FormSelect
                name="gender"
                control={control}
                label="Género"
                options={genderOptions}
                required
              />

              <TextField
                name="address"
                control={control}
                label="Dirección"
                placeholder="Ej: Calle Mayor 123, Madrid"
                error={errors.address?.message}
              />

              <FormSelect
                name="agreement"
                control={control}
                label="Convenio"
                options={agreementOptions}
                required
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {patient ? "Actualizando..." : "Guardando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {patient ? "Actualizar Paciente" : "Guardar Paciente"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
