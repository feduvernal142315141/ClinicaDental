"use client";

import { TableSearchBar } from "@/components/ui/antd";

interface PatientSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}

/**
 * PatientSearchBar
 *
 * Barra de búsqueda para la tabla de pacientes.
 * Thin wrapper de TableSearchBar con placeholder específico.
 */
export function PatientSearchBar({
  value,
  onChange,
  loading,
}: PatientSearchBarProps) {
  return (
    <TableSearchBar
      value={value}
      onChange={onChange}
      placeholder="Buscar paciente por nombre..."
      loading={loading}
    />
  );
}
