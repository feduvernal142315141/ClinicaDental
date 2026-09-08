export { OdontogramModule } from "./OdontogramModule";
export {
  createLocalStorageOdontogramAdapter,
  createApiOdontogramAdapter,
  createHistoricOdontogramAdapter,
} from "./adapters";
export { clearOdontogram } from "./store";
export type { ApiOdontogramAdapterOptions } from "./adapters";
export type {
  OdontogramAdapter,
  OdontogramModuleProps,
  OdontogramSnapshot,
  OdontogramSnapshotMetadata,
} from "./store";
// Solo el TIPO: los helpers y el glifo se importan de "@/lib/odontogram/notation",
// para no arrastrar el módulo entero a quien solo formatea un número.
export type { ToothNotation } from "./notation/types";
