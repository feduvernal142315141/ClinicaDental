"use client";

import { useState, useEffect } from "react";
import {
  getPatients,
  deletePatient as supabaseDelete,
} from "@/lib/supabase/patients";
import { calculateAge, formatDate } from "@/lib/entity/patients/patients-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/atomic/data-display/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Patient } from "@/lib/entity/patients/patients";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/contexts/alert-context";

interface PatientListProps {
  onNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onViewPatient: (patient: Patient) => void;
}

export function PatientList({
  onNewPatient,
  onEditPatient,
  onViewPatient,
}: PatientListProps) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { showConfirm, showSuccess, showError } = useAlert();

  useEffect(() => {
    if (!user?.clinicId) {
      setLoading(false);
      return;
    }

    const fetchPatients = async () => {
      try {
        setLoading(true);
        console.log("➡️ Session actual:", await supabase.auth.getSession());
        const data = await getPatients(user.clinicId as string);
        console.log("📡 Respuesta de Supabase:", data);
        setPatients(data);
      } catch (error) {
        console.error("❌ Error cargando pacientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user?.clinicId]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      if (user?.clinicId) {
        const data = await getPatients(user.clinicId as string);
        setPatients(data);
      }
      return;
    }

    const results = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.email?.toLowerCase().includes(query.toLowerCase()) ||
        p.phone?.includes(query)
    );
    setPatients(results);
  };

  const handleDelete = (patient: Patient) => {
    showConfirm({
      title: "¿Eliminar paciente?",
      description: (
        <>
          Esta acción no se puede deshacer. Se eliminará permanentemente la
          información del paciente <strong>{patient.name}</strong> y todos sus
          datos asociados.
        </>
      ),
      onConfirm: async () => {
        try {
          await supabaseDelete(patient.id);
          setPatients((prev) => prev.filter((p) => p.id !== patient.id));
          showSuccess("Paciente eliminado", "Se eliminó correctamente.");
        } catch (e) {
          showError("Error", "No se pudo eliminar el paciente.");
        }
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando pacientes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-end">
        <Button onClick={onNewPatient} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Paciente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Lista de Pacientes</CardTitle>
              <CardDescription>
                {patients.length} paciente{patients.length !== 1 ? "s" : ""}{" "}
                registrado
                {patients.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No se encontraron pacientes"
                  : "No hay pacientes registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {patient.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calculateAge(patient.dateOfBirth).years} años y{" "}
                          {calculateAge(patient.dateOfBirth).months} meses
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3" />
                              {patient.email}
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(patient.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{patient.address}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
                            <DropdownMenuItem
                              onClick={() => onViewPatient(patient)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditPatient(patient)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(patient)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
