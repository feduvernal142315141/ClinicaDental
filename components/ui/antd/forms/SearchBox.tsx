"use client";

import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Search } = Input;

interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  allowClear?: boolean;
  loading?: boolean;
}

/**
 * Ant Design Search Input component
 * Reusable search box with optional clear and loading states
 */
export function SearchBox({
  placeholder = "Buscar...",
  value,
  onChange,
  onSearch,
  className,
  allowClear = true,
  loading = false,
}: SearchBoxProps) {
  return (
    <Search
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onSearch={onSearch}
      allowClear={allowClear}
      loading={loading}
      className={className}
      prefix={<SearchOutlined className="text-gray-400" />}
      style={{ borderRadius: 8 }}
    />
  );
}
