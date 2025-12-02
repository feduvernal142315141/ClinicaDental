export const FilterOperator: Record<string, string> = {
  eq: 'EQ',
  neq: 'NEQ',
  greaterEqual: 'GTE',
  lessEqual: 'LTE',
  greater: 'GT',
  less: 'LT',
  contains: 'CONTAINS',
  containsIgnoreCase: 'CONTAINS_IGNORE_CASE',
  in: 'In',
  notIn: 'NotIn',
  notContains: 'NOT_CONTAINS',
  relatedEqual: 'RELATED_EQ',
  relatedContains: 'RELATED_CONTAINS',
};

export type FilterOperatorType = typeof FilterOperator[keyof typeof FilterOperator];
