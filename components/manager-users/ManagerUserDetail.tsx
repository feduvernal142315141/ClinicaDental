"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Descriptions,
  App,
  Space,
  Skeleton,
  Typography,
  Timeline,
  Avatar,
  Tag,
} from "antd";
import { Button } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  KeyOutlined,
  CalendarOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { PageCard, ActiveStatusTag } from "@/components/ui/antd";
import { useManagerUsers } from "@/lib/hooks/manager-users";
import { ManagerUser } from "@/lib/entity/manager-users";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface ManagerUserDetailProps {
  /** User ID to display */
  userId: string;
  /** Base path for navigation */
  basePath?: string;
}

/**
 * User info card section
 */
function UserInfoSection({ user }: { user: ManagerUser }) {
  return (
    <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
      <Avatar size={80} icon={<UserOutlined />} className="bg-blue-500" />
      <div>
        <Title level={4} className="mb-1!">
          {user.names} {user.surnames || ""}
        </Title>
        <Text type="secondary" className="block">
          {user.role?.name || "Sin rol asignado"}
        </Text>
        <div className="mt-2">
          <ActiveStatusTag active={user.active} />
        </div>
      </div>
    </div>
  );
}

/**
 * Manager User Detail Component
 *
 * Displays detailed information about a manager user.
 *
 * @example
 * <ManagerUserDetail userId="123" basePath="/settings/users" />
 */
export function ManagerUserDetail({
  userId,
  basePath = "/settings/users",
}: ManagerUserDetailProps) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [user, setUser] = useState<ManagerUser | null>(null);

  const { loadUserById, deleteUser, isLoading } = useManagerUsers();

  // Load user data
  useEffect(() => {
    if (userId) {
      loadUserById(userId).then((data) => {
        if (data) {
          setUser(data);
        } else {
          message.error("Usuario no encontrado");
          router.push(basePath);
        }
      });
    }
  }, [userId, loadUserById, message, router, basePath]);

  // Handle edit
  const handleEdit = useCallback(() => {
    router.push(`${basePath}/${userId}/edit`);
  }, [router, basePath, userId]);

  // Handle delete with confirmation
  const handleDelete = useCallback(() => {
    modal.confirm({
      title: "¿Eliminar usuario?",
      content: `¿Está seguro que desea eliminar al usuario "${user?.names}"? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      async onOk() {
        const success = await deleteUser(userId);
        if (success) {
          message.success("Usuario eliminado correctamente");
          router.push(basePath);
        }
      },
    });
  }, [modal, user, deleteUser, userId, message, router, basePath]);

  // Handle back
  const handleBack = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  // Loading state
  if (isLoading || !user) {
    return (
      <PageCard
        title="Detalle de Usuario"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Volver
          </Button>
        }
      >
        <Skeleton active avatar paragraph={{ rows: 10 }} />
      </PageCard>
    );
  }

  return (
    <PageCard
      title="Detalle de Usuario"
      subtitle={`ID: ${userId}`}
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Volver
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            Editar
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Eliminar
          </Button>
        </Space>
      }
    >
      {/* User Info Header */}
      <UserInfoSection user={user} />

      {/* Personal Information */}
      <Descriptions
        title={
          <span>
            <UserOutlined className="mr-2" />
            Información Personal
          </span>
        }
        bordered
        column={{ xs: 1, sm: 2, md: 2, lg: 3 }}
        className="mb-6"
      >
        <Descriptions.Item label="Tipo de Identificación">
          {user.identificationType?.name || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Número de Identificación">
          {user.identificationNumber || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Nombres">{user.names}</Descriptions.Item>
        <Descriptions.Item label="Apellidos">
          {user.surnames || "-"}
        </Descriptions.Item>
      </Descriptions>

      {/* Contact Information */}
      <Descriptions
        title={
          <span>
            <MailOutlined className="mr-2" />
            Información de Contacto
          </span>
        }
        bordered
        column={{ xs: 1, sm: 2 }}
        className="mb-6"
      >
        <Descriptions.Item label="Correo Electrónico">
          <a href={`mailto:${user.email}`}>{user.email}</a>
        </Descriptions.Item>
        <Descriptions.Item label="Teléfono Celular">
          {user.cellphone ? (
            <a href={`tel:${user.cellphone}`}>{user.cellphone}</a>
          ) : (
            "-"
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Role & Permissions */}
      <Descriptions
        title={
          <span>
            <SafetyOutlined className="mr-2" />
            Rol y Permisos
          </span>
        }
        bordered
        column={{ xs: 1, sm: 2 }}
        className="mb-6"
      >
        <Descriptions.Item label="Rol">
          <Tag color={user.role ? "blue" : "default"}>
            {user.role?.name || "Sin rol"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Instituciones Financieras">
          {user.financialInstitutions &&
          user.financialInstitutions.length > 0 ? (
            <Space wrap>
              {user.financialInstitutions.map((fiId, index) => (
                <Tag key={index} color="purple">{`Institución ${fiId}`}</Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">Sin instituciones asignadas</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Audit Information */}
      <Descriptions
        title={
          <span>
            <CalendarOutlined className="mr-2" />
            Información de Auditoría
          </span>
        }
        bordered
        column={{ xs: 1, sm: 2, md: 3 }}
        className="mb-6"
      >
        <Descriptions.Item label="Estado">
          <ActiveStatusTag active={user.active} />
        </Descriptions.Item>
        <Descriptions.Item label="Fecha de Creación">
          {user.createAt
            ? dayjs(user.createAt).format("DD/MM/YYYY HH:mm")
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Última Actualización">
          {user.updateAt
            ? dayjs(user.updateAt).format("DD/MM/YYYY HH:mm")
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Creado Por">
          {user.createBy || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Actualizado Por">
          {user.updateBy || "-"}
        </Descriptions.Item>
      </Descriptions>

      {/* Activity Timeline */}
      <div className="mt-8">
        <Title level={5}>
          <KeyOutlined className="mr-2" />
          Actividad Reciente
        </Title>
        <Timeline
          items={[
            {
              color: "green",
              children: (
                <>
                  <Text strong>Usuario creado</Text>
                  <br />
                  <Text type="secondary">
                    {user.createAt
                      ? dayjs(user.createAt).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </Text>
                </>
              ),
            },
            ...(user.updateAt && user.updateAt !== user.createAt
              ? [
                  {
                    color: "blue" as const,
                    children: (
                      <>
                        <Text strong>Última actualización</Text>
                        <br />
                        <Text type="secondary">
                          {dayjs(user.updateAt).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      </>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </PageCard>
  );
}
