import { Header, HeaderProps } from "./header";

export type PageHeaderProps = Omit<HeaderProps, "level" | "size">;

/**
 * @deprecated Use Header component instead with level={1}
 *
 * PageHeader - Componente atómico para encabezados de página
 *
 * Este componente ahora es un wrapper del componente Header unificado.
 * Se recomienda usar Header directamente para mayor flexibilidad.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Pacientes"
 *   description="Gestiona la información de tus pacientes"
 * />
 * ```
 *
 * @example Con acción
 * ```tsx
 * <PageHeader
 *   title="Campañas"
 *   description="Gestiona tus campañas de marketing"
 *   action={<Button>Nueva Campaña</Button>}
 * />
 * ```
 */
export function PageHeader(props: PageHeaderProps) {
  return <Header {...props} level={1} />;
}
