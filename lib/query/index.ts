/**
 * Cliente tipado de queries — barrel público
 *
 * Único punto de import recomendado: `@/lib/query`.
 * Fuente de verdad del contrato de filtros/orden en el front (Fase 1).
 */
export * from "./operators";
export * from "./valueType";
export * from "./builder";
export * from "./search";
export * from "./domains/patients";
export * from "./domains/services";
export * from "./domains/roles";
