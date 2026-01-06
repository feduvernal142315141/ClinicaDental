"use client";

import { DoctorForm } from "../form/DoctorForm";
import { SectionTitle } from "@/components/ui/antd";
import { useDoctorsPage } from "@/hooks/use-doctors-page";
import { useRouter } from "next/navigation";
import { Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";

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
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold mb-1">Detalle del Doctor</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Visualice la información del doctor en el sistema
          </p>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
            size="large"
          >
            Editar
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToList}
            size="large"
            variant="outline"
          >
            Atrás
          </Button>
        </Space>
      </div>
      <DoctorForm doctorId={doctorId} basePath={basePath} readOnly />
    </>
  );
}
