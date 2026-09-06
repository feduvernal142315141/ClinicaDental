/**
 * Estilo UNDERLINE de la franja de pestañas del expediente
 * (`/patients/[patientId]`).
 *
 * Vive como constantes de `className` y NO como una variante del primitivo
 * `components/ui/primitives/shadcn/tabs.tsx` a propósito: ese primitivo lo
 * consumen otros ocho ficheros con la franja "pill" (fondo elevado, cápsula
 * redondeada). Cambiarlo ahí rediseñaría media aplicación por un ajuste de una
 * sola vista, así que el estilo VIAJA POR `className` desde la página y el
 * primitivo se queda como está.
 *
 * Uso:
 *   <TabsList className={PATIENT_TABS_LIST_CLASS}>
 *     <TabsTrigger className={PATIENT_TAB_TRIGGER_CLASS} value="…">…</TabsTrigger>
 *   </TabsList>
 *
 * `cn()` (tailwind-merge) resuelve el conflicto quedándose con la clase de
 * aquí, que llega después de la del primitivo; por eso cada anulación se
 * escribe con la MISMA familia de utilidad que la clase base a la que sustituye
 * (p. ej. `p-0` para matar `p-1`), y no con un `!important` ni con un selector
 * más específico.
 */

/**
 * Contenedor de la franja. Anula del primitivo:
 * - `bg-elevated` → `bg-transparent`: la franja subrayada no es una cápsula;
 *   sobre el lienzo del expediente un fondo elevado dibujaría una barra gris.
 *   (Si el primitivo cambiara a `bg-muted`, `bg-transparent` lo sigue matando:
 *   misma familia de utilidad.)
 * - `rounded-xl` → `rounded-none` y `border` (los cuatro lados) → `border-0
 *   border-b`: solo queda el hairline inferior sobre el que se apoya el
 *   indicador activo.
 * - `h-10` → `h-auto`: la altura la marca el padding del trigger, no una caja
 *   fija; con `pb-2.5` el subrayado necesita respirar.
 * - `p-1` → `p-0`: el hueco interior desalineaba el subrayado respecto al borde
 *   inferior. OJO: ese `p-1` no era decorativo — ver la nota de foco en
 *   `PATIENT_TAB_TRIGGER_CLASS`.
 * - `gap-1` → `gap-6`: sin cápsulas, las etiquetas necesitan aire para leerse
 *   como pestañas separadas.
 * - `w-max`: la lista no encoge; el scroll horizontal lo pone el contenedor de
 *   la página (`overflow-x-auto`), que es el único scroll de esa franja.
 */
export const PATIENT_TABS_LIST_CLASS =
  "h-auto w-max gap-7 rounded-none border-0 border-b border-hairline bg-transparent p-0";

/**
 * Cada pestaña. Anula del primitivo:
 * - `rounded-lg` → `rounded-none`, `px-3.5 py-1.5` → `px-0 pb-2.5 pt-1`: la
 *   pestaña es texto con subrayado, no un botón con relleno.
 * - Estado activo `bg-surface` + `shadow-sm` + `text-ink` → `bg-transparent`,
 *   `shadow-none`, `text-brand` + `font-semibold`: el énfasis lo lleva el
 *   color de marca y la línea inferior, no una cápsula elevada.
 * - Indicador: `border-b-2 border-transparent` en reposo y `border-brand` en
 *   activo, con `-mb-px` para que la línea de 2px se monte sobre el hairline de
 *   la lista. El borde transparente de base es deliberado: si la línea
 *   apareciera solo en activo, cambiar de pestaña movería 2px toda la franja.
 *
 * ⚠️ ACCESIBILIDAD — NO BORRAR `focus-visible:ring-offset-*` (WCAG 2.2 §2.1.1,
 * foco visible en navegación por teclado). El `p-1` del `TabsList` original
 * existía para que el anillo de foco de la pestaña cupiera DENTRO de la lista;
 * al quitarlo con `p-0`, el anillo se dibujaría justo en el límite del
 * contenedor `overflow-x-auto` de la página y quedaría recortado — precisamente
 * en la primera y la última pestaña, que son las que el tabulador alcanza
 * primero. El desplazamiento del anillo (`ring-offset-2` pintado sobre
 * `ring-offset-canvas`) devuelve ese respiro, y `rounded-sm` evita que el
 * anillo salga en ángulo recto sobre un elemento sin fondo. Verificado con
 * teclado: Tab entra en la franja y las flechas recorren las pestañas con el
 * anillo íntegro y visible en claro y en oscuro.
 */
export const PATIENT_TAB_TRIGGER_CLASS =
  "-mb-px rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-1.5 text-subtle shadow-none data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-brand data-[state=active]:shadow-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
