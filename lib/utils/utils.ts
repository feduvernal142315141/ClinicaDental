import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Columns,
  FieldMapping,
  FilterObject,
} from "@/components/ui/composed/table/TableModels";
import moment from "moment";
import { FilterOperator } from "@/lib/models/filterOperator";
import { FilterValueType } from "@/lib/models/filterValueType";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const convertToQueryString = (
  filterObject: FilterObject | undefined,
  fieldMappings: FieldMapping[],
  columns: Columns[],
): string => {
  const queryStringArray: string[] = [];
  if (filterObject) {
    for (const filter of filterObject?.filters) {
      if (filter.value !== "") {
        const fieldMapping: FieldMapping | undefined = fieldMappings.find(
          (mapping) => mapping.field === filter.field,
        );

        // Buscar la columna correspondiente para obtener el filterType
        const column: Columns | undefined = columns.find(
          (col) => col.key === filter.field,
        );

        // example field related: product.name
        let { field } = filter;
        if (fieldMapping?.relatedField) {
          field = fieldMapping.relatedField;
        }

        // Manejo especial para dateRange basado en filterType: generar dos filtros separados
        if (column?.filterType === "dateRange" && filter.value.includes("|")) {
          const [startDate, endDate] = filter.value.split("|");
          const fieldMappingType = "DateTime";
          const formattedStartDate = formatDateStart(startDate);
          const formattedEndDate = formatDateEnd(endDate);

          // Filtro para fecha inicio (mayorque/GT)
          queryStringArray.push(
            `${field}__GTE__${fieldMappingType}_${formattedStartDate}__${filterObject.logic.toUpperCase()}`,
          );

          // Filtro para fecha fin (menorque/LT)
          queryStringArray.push(
            `${field}__LTE__${fieldMappingType}_${formattedEndDate}__${filterObject.logic.toUpperCase()}`,
          );
        } else if (column?.filterType === "datetime") {
          const fieldMappingType = "DateTime";
          const formattedDate = formatDateStart(filter.value);

          if (filter.operator === "eq" || filter.operator === "EQ") {
            // Filtro para fecha inicio (mayorque/GT)
            queryStringArray.push(
              `${field}__GTE__${fieldMappingType}_${formattedDate}__${filterObject.logic.toUpperCase()}`,
            );

            // Filtro para fecha fin (menorque/LT) - usar fecha con milisegundos en 999
            const formattedEndDate = formatDateEnd(filter.value);
            queryStringArray.push(
              `${field}__LTE__${fieldMappingType}_${formattedEndDate}__${filterObject.logic.toUpperCase()}`,
            );
          } else if (filter.operator === "neq" || filter.operator === "NEQ") {
            // Filtro para fecha inicio (mayorque/GT)
            queryStringArray.push(
              `${field}__LTE__${fieldMappingType}_${formattedDate}__OR`,
            );

            // Filtro para fecha fin (menorque/LT) - usar fecha con milisegundos en 999
            const formattedEndDate = formatDateEnd(filter.value);
            queryStringArray.push(
              `${field}__GTE__${fieldMappingType}_${formattedEndDate}__${filterObject.logic.toUpperCase()}`,
            );
          } else {
            queryStringArray.push(
              `${field}__${
                filter.operator
              }__${fieldMappingType}_${formattedDate}__${filterObject.logic.toUpperCase()}`,
            );
          }
        } else {
          // Lógica normal para otros operadores
          let operator = FilterOperator[filter.operator] || filter.operator;

          // Para filtros de texto, usar containsIgnoreCase en lugar de contains
          if (
            (fieldMapping?.type === FilterValueType.string ||
              !fieldMapping?.type) &&
            filter.operator === "contains"
          ) {
            operator = fieldMapping?.relatedField
              ? FilterOperator.contains
              : FilterOperator.containsIgnoreCase;
          }

          if (fieldMapping?.relatedField) {
            operator = `RELATED_${operator}`;
          }

          let value: string;
          if (
            field === "campaignStatusId" ||
            field === "periodStatusId" ||
            field === "periodProcessStatusId"
          ) {
            // Caso especial: backend espera <field>__EQ__UUID__<id>
            // Detectar UUID simple (8-4-4-4-12)
            const uuidRegex =
              /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            if (uuidRegex.test(filter.value)) {
              operator = "EQ";
              // Importante: usar doble guion bajo tras UUID para cumplir con el formato del backend
              value = `UUID_${filter.value}`;
              queryStringArray.push(
                `${field}__${operator}__${value}__${filterObject.logic.toUpperCase()}`,
              );
              continue; // saltar push duplicado al final
            }
          }

          if (fieldMapping && fieldMapping.type) {
            value = `${fieldMapping.type}_${filter.value}`;
          } else {
            value = filter.value;
          }

          queryStringArray.push(
            `${field}__${operator}__${value}__${filterObject.logic.toUpperCase()}`,
          );
        }
      }
    }
  }
  return queryStringArray.join("&filters=");
};

export const convertFilterToType = (filter: string | undefined) => {
  if (filter === "boolean") {
    return FilterValueType.bool;
  }
  if (filter === "numeric") {
    return FilterValueType.int;
  }
  if (filter === "numericText") {
    return FilterValueType.int; // Enviar como Integer al backend
  }
  if (filter === "date") {
    return FilterValueType.date;
  }
  // if (filter === 'text') {
  //   return FilterValueType.string;
  // }
  return undefined;
};

const formatDateStart = (dateValue: string): string => {
  try {
    return moment(dateValue).format("YYYY-MM-DD HH:mm:ss");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return dateValue;
  }
};

const formatDateEnd = (dateValue: string): string => {
  try {
    return moment(dateValue).add(1, "second").format("YYYY-MM-DD HH:mm:ss");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return dateValue;
  }
};
