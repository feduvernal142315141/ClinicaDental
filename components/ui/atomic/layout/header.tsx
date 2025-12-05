import { cn } from "@/lib/utils/utils";
import { SearchInput } from "@/components/ui/atomic/forms/search-input";

export interface HeaderProps {
  title: string;
  description?: string;
  className?: string;
  /**
   * Heading level (h1, h2, h3)
   * @default 1
   */
  level?: 1 | 2 | 3;
  /**
   * Size variant
   * @default "xl" for level 1, "lg" for level 2, "md" for level 3
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Show search bar on the right side
   * @default false
   */
  showSearch?: boolean;
  /**
   * Search placeholder text
   * @default "Search"
   */
  searchPlaceholder?: string;
  /**
   * Search change handler
   */
  onSearch?: (value: string) => void;
  action?: React.ReactNode;
}

/**
 * Header - Componente atómico unificado para encabezados
 *
 * Reemplaza a PageHeader y SectionHeader siguiendo principios DRY y SOLID
 *
 * @example Encabezado de página (h1)
 * ```tsx
 * <Header
 *   level={1}
 *   title="Configuración"
 *   description="Administra la configuración de tu clínica"
 * />
 * ```
 *
 * @example Con búsqueda
 * ```tsx
 * <Header
 *   level={1}
 *   title="Pacientes"
 *   showSearch
 *   searchPlaceholder="Buscar pacientes..."
 *   onSearch={(value) => console.log(value)}
 * />
 * ```
 *
 * @example Encabezado de sección (h2)
 * ```tsx
 * <Header
 *   level={2}
 *   size="lg"
 *   title="Vista General"
 *   description="Snapshot del estado actual"
 * />
 * ```
 *
 * @example Con acción
 * ```tsx
 * <Header
 *   level={1}
 *   title="Campañas"
 *   action={<Button>Nueva Campaña</Button>}
 * />
 * ```
 */
export function Header({
  title,
  description,
  className,
  level = 1,
  size,
  showSearch = false,
  searchPlaceholder = "Search",
  onSearch,
  action,
}: HeaderProps) {
  // Auto-determine size based on level if not provided
  const defaultSize = level === 1 ? "xl" : level === 2 ? "lg" : "md";
  const finalSize = size || defaultSize;

  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const HeadingTag = `h${level}` as "h1" | "h2" | "h3";

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-1">
        <HeadingTag
          className={cn("font-bold tracking-tight", sizeClasses[finalSize])}
        >
          {title}
        </HeadingTag>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <SearchInput
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-80 border border-color-base-300 rounded-2xl"
          />
        )}
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
