/**
 * Palette of distinguishable colors for doctor assignment in the scheduler.
 * Chosen for readability on both light and dark card backgrounds.
 */
const SCHEDULER_COLORS = [
  "#1677ff", // blue
  "#52c41a", // green
  "#fa8c16", // orange
  "#eb2f96", // magenta
  "#722ed1", // purple
  "#13c2c2", // cyan
  "#f5222d", // red
  "#faad14", // gold
  "#2f54eb", // geekblue
  "#a0d911", // lime
  "#fa541c", // volcano
  "#597ef7", // light-blue
] as const;

/**
 * Returns a color from the palette based on the doctor's index.
 * Cycles if there are more doctors than colors.
 */
export function getDoctorColor(index: number): string {
  return SCHEDULER_COLORS[index % SCHEDULER_COLORS.length];
}
