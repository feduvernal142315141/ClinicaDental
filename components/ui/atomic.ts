/**
 * Atomic UI Components
 *
 * Componentes atómicos reutilizables para la interfaz de usuario.
 * Estos componentes siguen el principio de responsabilidad única
 * y son completamente independientes de la lógica de negocio.
 */

export { PageHeader } from "./atomic/layout/page-header";
export { SectionHeader } from "./atomic/layout/section-header";
export { LoadingSpinner } from "./atomic/feedback/loading-spinner";
export { EmptyState } from "./atomic/feedback/empty-state";

export type { PageHeaderProps } from "./atomic/layout/page-header";
export type { SectionHeaderProps } from "./atomic/layout/section-header";
export type { LoadingSpinnerProps } from "./atomic/feedback/loading-spinner";
export type { EmptyStateProps } from "./atomic/feedback/empty-state";
