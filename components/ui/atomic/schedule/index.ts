/**
 * SCHEDULE ATOMS — bloques reutilizables de los editores de horario
 * (Opciones Generales de clínica y Horarios de doctor). Ver diseño 2026 en
 * `schedule-day-card.tsx` (contenedor + estados) y componentes hermanos.
 *
 * Todos son presentacionales (sin fetch, sin acoplar generics de
 * react-hook-form): el consumidor los conecta a su propio `FormField`.
 */

export * from "./schedule-day-card";
export * from "./day-toggle";
export * from "./schedule-time-field";
export * from "./time-range-field";
export * from "./closed-state";
export * from "./clinic-range-hint";
export * from "./schedule-header";
export * from "./day-overview-strip";
