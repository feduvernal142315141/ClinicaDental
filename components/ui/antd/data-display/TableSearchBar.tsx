"use client";

import { Input } from "antd";

const { Search } = Input;

interface TableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

/**
 * TableSearchBar
 *
 * Barra de búsqueda genérica para tablas paginadas.
 * El debounce debe manejarse en el hook del componente padre.
 *
 * @example
 * <TableSearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Buscar doctor por nombre..."
 *   loading={loading}
 * />
 */
export function TableSearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
  loading,
}: TableSearchBarProps) {
  return (
    <div className="mb-4 flex justify-end">
      <Search
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSearch={(val) => onChange(val)}
        allowClear
        loading={loading}
        style={{ maxWidth: 400 }}
      />
    </div>
  );
}
