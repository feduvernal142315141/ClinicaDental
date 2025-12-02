"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TextField } from "../ui/TextField";
import { FormSelect } from "../ui/FormSelect";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Doctor } from "@/lib/doctors";
import { DoctorScheduleForm } from "./DoctorScheduleForm";
import { createDoctor, updateDoctor } from "@/lib/supabase/doctors";
import { useAuth } from "@/contexts/auth-context";
import TextArea from "@/components/ui/textarea";

const SPECIALTIES = [
  "Odontología General",
  "Ortodoncia",
  "Endodoncia",
  "Periodoncia",
  "Cirugía Oral",
  "Odontopediatría",
  "Prostodoncia",
  "Implantología",
];

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("El email no es válido"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  specialty: z.string().min(1, "La especialidad es obligatoria"),
  licenseNumber: z.string().min(1, "El número de licencia es obligatorio"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  schedule: z.record(
    z.object({
      enabled: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
      breakStart: z.string().optional(),
      breakEnd: z.string().optional(),
    })
  ),
});

const defaultSchedule = {
  enabled: false,
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "",
  breakEnd: "",
};

export function DoctorForm({
  doctor,
  onSuccess,
  onCancel,
}: {
  doctor: Doctor | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    register,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: doctor?.name || "",
      email: doctor?.email || "",
      phone: doctor?.phone || "",
      specialty: doctor?.specialty || "",
      licenseNumber: doctor?.licenseNumber || "",
      description: doctor?.description || "",
      isActive: doctor?.isActive ?? true,
      schedule: doctor?.schedule || {
        monday: { ...defaultSchedule },
        tuesday: { ...defaultSchedule },
        wednesday: { ...defaultSchedule },
        thursday: { ...defaultSchedule },
        friday: { ...defaultSchedule },
        saturday: { ...defaultSchedule },
        sunday: { ...defaultSchedule },
      },
    },
  });

  const { user } = useAuth();

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (doctor) {
        await updateDoctor(doctor.id, values);
      } else {
        await createDoctor({...values, clinic_id: user?.clinicId ?? "", user_id: user?.id ?? ""});
      }
      onSuccess();
    } catch (error) {
      console.error("Error guardando doctor:", error);
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
          {doctor
            ? "Modifica la información del doctor"
            : "Registra un nuevo doctor en el sistema"}
        </p>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Información del Doctor</CardTitle>
          <CardDescription>
            Completa todos los campos obligatorios para{" "}
            {doctor ? "actualizar" : "registrar"} el doctor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
              <TextField
                name="name"
                control={control}
                label="Nombre Completo"
                placeholder="Ej: Dr. Juan Pérez"
                required
                error={errors.name?.message}
              />

              <TextField
                name="email"
                control={control}
                type="email"
                label="Correo Electrónico"
                placeholder="Ej: doctor@email.com"
                required
                error={errors.email?.message}
              />

              <TextField
                name="phone"
                control={control}
                label="Teléfono"
                placeholder="Ej: +505 8888-9999"
                required
                error={errors.phone?.message}
              />

              <FormSelect
                name="specialty"
                control={control}
                label="Especialidad"
                options={SPECIALTIES.map((s) => ({ id: s, label: s }))}
                required
              />

              <TextField
                name="licenseNumber"
                control={control}
                label="Número de Licencia"
                placeholder="Ej: 12345-OD"
                required
                error={errors.licenseNumber?.message}
              />

              <div className="flex items-center space-x-2 mt-6">
                <Switch
                  id="isActive"
                  checked={!!doctor?.isActive}
                  onCheckedChange={(val) => setValue("isActive", val)}
                />
                <Label htmlFor="isActive">Doctor Activo</Label>
              </div>
            </div>

            <div className="space-y-2">
              <TextArea
                id="description"
                label="Descripción"
                placeholder="Ej: Experto en ortodoncia con 10 años de experiencia"
                rows={3}
                {...register("description", { required: "La descripción es obligatoria" })}
                error={errors.description?.message}
              />
            </div>

            <DoctorScheduleForm control={control} />

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {doctor ? "Actualizando..." : "Guardando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {doctor ? "Actualizar Doctor" : "Guardar Doctor"}
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
