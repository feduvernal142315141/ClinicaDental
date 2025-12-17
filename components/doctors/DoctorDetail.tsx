"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Descriptions, Button, Space, Divider, App } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { PageCard, LoadingSpinner, StatusTag } from "@/components/ui/antd";
import { useDoctors } from "@/lib/hooks/doctors";
import { Doctor } from "@/lib/entity/doctors";
import dayjs from "dayjs";

interface DoctorDetailProps {
  /** Doctor ID to display */
  doctorId: string;
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Doctor Detail Component
 *
 * Displays detailed information about a doctor.
 *
 * @example
 * <DoctorDetail doctorId="123" basePath="/settings/users" />
 */
export function DoctorDetail({
  doctorId,
  basePath = "/settings/users",
}: DoctorDetailProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { loadDoctorById, isLoading } = useDoctors();
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    if (doctorId) {
      loadDoctorById(doctorId).then((data) => {
        if (data) {
          setDoctor(data);
        } else {
          message.error("Doctor no encontrado");
          router.push(basePath);
        }
      });
    }
  }, [doctorId, loadDoctorById, message, router, basePath]);

  const handleEdit = () => {
    router.push(`${basePath}/${doctorId}/edit`);
  };

  const handleBack = () => {
    router.push(basePath);
  };

  if (isLoading || !doctor) {
    return <LoadingSpinner tip="Cargando doctor..." fullPage />;
  }

  return (
    <PageCard
      title="Detalle del Doctor"
      subtitle={doctor.name}
      extra={
        <Space>
          <Button icon={<EditOutlined />} type="primary" onClick={handleEdit}>
            Editar
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Volver
          </Button>
        </Space>
      }
    >
      <Divider orientation="left">Información Básica</Divider>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Nombre">{doctor.name}</Descriptions.Item>
        <Descriptions.Item label="Email">{doctor.email}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">
          {doctor.phone || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Estado">
          <StatusTag
            status={doctor.active ? "success" : "error"}
            text={doctor.active ? "Activo" : "Inactivo"}
          />
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Información Profesional</Divider>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Licencia">
          {doctor.licenceNumber}
        </Descriptions.Item>
        <Descriptions.Item label="Especialidad">
          {doctor.specialty || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Género">
          {doctor.gender || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Rol">
          {doctor.role?.name || "-"}
        </Descriptions.Item>
      </Descriptions>

      {doctor.description && (
        <>
          <Divider orientation="left">Descripción</Divider>
          <p className="text-gray-700">{doctor.description}</p>
        </>
      )}

      <Divider orientation="left">Información del Sistema</Divider>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Fecha de Creación">
          {dayjs(doctor.createAt).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label="ID">{doctor.id}</Descriptions.Item>
      </Descriptions>
    </PageCard>
  );
}
