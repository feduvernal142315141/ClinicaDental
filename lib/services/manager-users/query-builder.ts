/**
 * Query Builder Utilities for Manager Users
 *
 * Helper functions to build filter and order query strings
 * following the API's expected format: campo,operador,valor
 */

import { FilterOperator } from "@/lib/models/filterOperator";
import { FilterValueType } from "@/lib/models/filterValueType";

/**
 * Available fields for filtering manager users
 */
export type ManagerUserFilterField =
  | "names"
  | "surnames"
  | "email"
  | "identificationNumber"
  | "cellphone"
  | "active"
  | "createAt"
  | "roleId"
  | "roleName";

/**
 * Available fields for ordering manager users
 */
export type ManagerUserOrderField =
  | "names"
  | "surnames"
  | "email"
  | "createAt"
  | "active";

/**
 * Order direction
 */
export type OrderDirection = "asc" | "desc";

/**
 * Builds a filter string for the API
 * @param field Field to filter on
 * @param operator Filter operator
 * @param value Filter value
 * @param valueType Optional value type prefix
 * @returns Formatted filter string
 *
 * @example
 * buildFilter('active', 'eq', true, 'boolean')
 * // Returns: 'active,eq,boolean:true'
 *
 * @example
 * buildFilter('names', 'contains', 'Juan')
 * // Returns: 'names,contains,Juan'
 */
export function buildFilter(
  field: ManagerUserFilterField,
  operator: keyof typeof FilterOperator,
  value: string | number | boolean | Date,
  valueType?: keyof typeof FilterValueType
): string {
  let formattedValue: string;

  if (valueType) {
    const prefix = FilterValueType[valueType].toLowerCase();
    if (value instanceof Date) {
      formattedValue = `${prefix}:${formatDateForFilter(
        value,
        valueType === "dateTime"
      )}`;
    } else {
      formattedValue = `${prefix}:${value}`;
    }
  } else {
    formattedValue = String(value);
  }

  return `${field},${operator},${formattedValue}`;
}

/**
 * Builds an order string for the API
 * @param field Field to order by
 * @param direction Order direction
 * @returns Formatted order string
 *
 * @example
 * buildOrder('createAt', 'desc')
 * // Returns: 'createAt,desc'
 */
export function buildOrder(
  field: ManagerUserOrderField,
  direction: OrderDirection
): string {
  return `${field},${direction}`;
}

/**
 * Formats a date for filter queries
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
function formatDateForFilter(date: Date, includeTime: boolean): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Common filter presets for manager users
 */
export const ManagerUserFilters = {
  /**
   * Filter by active status
   */
  byActive: (active: boolean) => buildFilter("active", "eq", active, "bool"),

  /**
   * Filter by name (contains)
   */
  byNameContains: (name: string) =>
    buildFilter("names", "containsIgnoreCase", name),

  /**
   * Filter by email (contains)
   */
  byEmailContains: (email: string) =>
    buildFilter("email", "containsIgnoreCase", email),

  /**
   * Filter by identification number
   */
  byIdentificationNumber: (number: string) =>
    buildFilter("identificationNumber", "eq", number),

  /**
   * Filter by role ID
   */
  byRoleId: (roleId: string) => buildFilter("roleId", "eq", roleId),

  /**
   * Filter by creation date range
   */
  byCreatedAfter: (date: Date) =>
    buildFilter("createAt", "greaterEqual", date, "date"),

  byCreatedBefore: (date: Date) =>
    buildFilter("createAt", "lessEqual", date, "date"),
} as const;

/**
 * Common order presets for manager users
 */
export const ManagerUserOrders = {
  /**
   * Order by creation date (newest first)
   */
  newestFirst: () => buildOrder("createAt", "desc"),

  /**
   * Order by creation date (oldest first)
   */
  oldestFirst: () => buildOrder("createAt", "asc"),

  /**
   * Order by name (A-Z)
   */
  nameAsc: () => buildOrder("names", "asc"),

  /**
   * Order by name (Z-A)
   */
  nameDesc: () => buildOrder("names", "desc"),

  /**
   * Order by email (A-Z)
   */
  emailAsc: () => buildOrder("email", "asc"),
} as const;
