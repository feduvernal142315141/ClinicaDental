// Los catálogos de SERVICIOS ficticios se eliminaron: el catálogo y las
// plantillas salen ahora del backend (lib/odontogram/adapters/service-catalog.ts
// y service-templates.ts). Un catálogo mock usado como fallback presentaba
// precios inventados como si fueran los de la clínica.
//
// `TOOTH_TEMPLATES_MOCK` se queda: NO son servicios, son presets clínicos de
// superficie (sellante oclusal, caries ICDAS 1-2…) que usa la pestaña
// Superficies y que no tienen tabla en el backend.
export { TOOTH_TEMPLATES_MOCK } from "./tooth-templates.mock"
