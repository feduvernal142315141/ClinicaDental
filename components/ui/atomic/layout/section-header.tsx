import { Header, HeaderProps } from "./header";

export type SectionHeaderProps = Omit<HeaderProps, "level">;

/**
 * @deprecated Use Header component instead with level={2}
 *
 * SectionHeader - Componente atómico para subtítulos de sección dentro de páginas
 *
 * Este componente ahora es un wrapper del componente Header unificado.
 * Se recomienda usar Header directamente para mayor flexibilidad.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Vista General"
 *   description="Snapshot del estado actual de la clínica"
 *   size="md"
 * />
 * ```
 *
 * @example Con acción
 * ```tsx
 * <SectionHeader
 *   title="Estadísticas"
 *   size="sm"
 *   action={<Button variant="outline" size="sm">Ver más</Button>}
 * />
 * ```
 */
export function SectionHeader(props: SectionHeaderProps) {
  return <Header {...props} level={2} />;
}
