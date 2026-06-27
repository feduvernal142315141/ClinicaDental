"use client";

import { DoctorForm } from "../form/DoctorForm";
import { useDoctorsPage } from "@/lib/hooks/doctors/use-doctors-page";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { PageHeader } from "@/components/ui/layout/page-header";
import { Pencil, ArrowLeft } from "lucide-react";

interface DoctorDetailProps {
  /** Doctor ID to display */
  doctorId: string;
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Doctor Detail Component
 *
 * Displays detailed information about a doctor in read-only mode.
 * Uses the same DoctorForm component with disabled fields.
 *
 * @example
 * <DoctorDetail doctorId="123" basePath="/settings/doctors" />
 */
export function DoctorDetail({
  doctorId,
  basePath = "/settings/doctors",
}: DoctorDetailProps) {
  const router = useRouter();
  const { handleBackToList } = useDoctorsPage({ basePath });

  const handleEdit = () => {
    router.push(`${basePath}/${doctorId}/edit`);
  };

  return (
    <>
      <PageHeader
        title="Detalle del Doctor"
        subtitle="Visualice la información del doctor en el sistema"
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleBackToList}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
          </div>
        }
      />
      <DoctorForm doctorId={doctorId} basePath={basePath} readOnly />
    </>
  );
}
