"use client";

import { Button, Space, Input, Select } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { SearchBox } from "../forms/SearchBox";

export interface PageToolbarProps {
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search value */
  searchValue?: string;
  /** Callback when search changes */
  onSearchChange?: (value: string) => void;
  /** Show search box */
  showSearch?: boolean;
  /** Primary action button text */
  primaryActionText?: string;
  /** Primary action callback */
  onPrimaryAction?: () => void;
  /** Show primary action button */
  showPrimaryAction?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Additional filters */
  filters?: React.ReactNode;
  /** Extra actions */
  extra?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Ant Design Page Toolbar component
 * Common toolbar with search, filters, and actions
 *
 * @example
 * <PageToolbar
 *   searchPlaceholder="Buscar usuarios..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   primaryActionText="Nuevo Usuario"
 *   onPrimaryAction={() => router.push('/users/new')}
 *   onRefresh={loadUsers}
 *   loading={isLoading}
 * />
 */
export function PageToolbar({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  showSearch = true,
  primaryActionText,
  onPrimaryAction,
  showPrimaryAction = true,
  showRefresh = true,
  onRefresh,
  loading = false,
  filters,
  extra,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4 ${
        className || ""
      }`}
    >
      {/* Left side - Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
        {showSearch && (
          <SearchBox
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
            loading={loading}
            className="w-full sm:w-64"
          />
        )}
        {filters}
      </div>

      {/* Right side - Actions */}
      <Space>
        {extra}
        {showRefresh && onRefresh && (
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            disabled={loading}
          >
            Actualizar
          </Button>
        )}
        {showPrimaryAction && primaryActionText && onPrimaryAction && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onPrimaryAction}
          >
            {primaryActionText}
          </Button>
        )}
      </Space>
    </div>
  );
}
