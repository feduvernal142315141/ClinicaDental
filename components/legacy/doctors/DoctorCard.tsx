"use client";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/atomic/data-display/card";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import { Badge } from "@/components/ui/atomic/data-display/badge";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User, Edit, Trash2, Clock } from "lucide-react";
import type { Doctor } from "@/lib/doctors";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { doctorService } from "@/lib/doctors";
import DoctorSchedule from "./DoctorSchedule";
import { deleteDoctor } from "@/lib/supabase/doctors";
import { useAlert } from "@/lib/contexts/alert-context";

export default function DoctorCard({
  doctor,
  onEdit,
  reload,
}: {
  doctor: Doctor;
  onEdit: (d: Doctor) => void;
  reload: () => void;
}) {
  const { showConfirm, showSuccess, showError } = useAlert();

  const handleDelete = () => {
    showConfirm({
      title: "¿Eliminar paciente?",
      description: (
        <>
          Esta acción no se puede deshacer. Se eliminará permanentemente la
          información del doctor <strong>{doctor.name}</strong> y todos sus
          datos asociados.
        </>
      ),
      onConfirm: async () => {
        try {
          await deleteDoctor(doctor.id);
          showSuccess("Doctor eliminado", "Se eliminó correctamente.");
          reload();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          showError("Error", "No se pudo eliminar el doctor.");
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{doctor.name}</CardTitle>
            <CardDescription>{doctor.specialty}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={doctor.isActive ? "default" : "secondary"}>
            {doctor.isActive ? "Activo" : "Inactivo"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => onEdit(doctor)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Email:</strong> {doctor.email}
            </p>
            <p>
              <strong>Teléfono:</strong> {doctor.phone}
            </p>
            <p>
              <strong>Licencia:</strong> {doctor.licenseNumber}
            </p>
          </div>
          <div>
            <p>
              <strong>Descripción:</strong>
            </p>
            <p className="text-muted-foreground">{doctor.description}</p>
          </div>
        </div>
        <Separator className="my-3" />
        <DoctorSchedule schedule={doctor.schedule} />
      </CardContent>
    </Card>
  );
}
