---
name: ui-interacciones
description: Reglas de interacción para controles, menús contextuales, selects y edición inline en front-clinic — adaptación al sistema Bento de la skill oficial frontend-design (anthropics/claude-code) y de las Web Interface Guidelines de Vercel (vercel-labs). Úsala al diseñar o revisar menús ⋯, popovers, propiedades editables en tablas/filas, o cualquier control interactivo nuevo.
---

# UI · Interacciones (adaptado a Bento)

Fuentes importadas y leídas el 2026-08-07:
`anthropics/claude-code → plugins/frontend-design/skills/frontend-design/SKILL.md` ·
`vercel-labs/web-interface-guidelines → command.md` ·
`lotfb86/web-design-skills → 03-web-design-guidelines` (envoltorio de la anterior).
Lo de abajo es la **adaptación**, no la copia: tokens Bento, español, WCAG 2.2, y los
componentes reales de `@/components/ui`.

## Menús contextuales (⋯)

- Un menú contextual contiene **solo acciones** (verbos). Las **propiedades**
  (estado, prioridad, fase…) NO se editan dentro de un menú: ni como radios
  planos ni como submenús. Un menú con 10+ entradas o con scroll interno no es
  un menú, es un formulario mal colocado.
- ≤7 ítems. Si no caben, sobra contenido, no falta scroll.
- Las destructivas van al final con `variant="destructive"` y SIEMPRE piden
  confirmación (o dan deshacer). Nunca inmediatas.
- El rótulo lleva verbo («Quitar del presupuesto…»); la elipsis solo si abre
  un diálogo.

## Propiedades editables en filas — patrón «propiedad inline»

- **El valor visible es el disparador.** La pill de estado de la fila se pulsa
  y abre su propio selector, ahí mismo. Nada de ir al ⋯ a buscar la propiedad:
  eso esconde lo editable y añade un salto.
- Disparador = `<button>` real (jamás `<div onClick>`), mostrando el valor
  vigente + `ChevronDown`. `aria-label` con contexto: «Cambiar estado de
  {cosa}: {valor}».
- Selector = `DropdownMenuRadioGroup`/`RadioItem` de `@/components/ui`
  (da `role="menuitemradio"` + `aria-checked` gratis). Cada opción pinta el
  **mismo componente** que la tabla (`StatusBadge` con su `tone`): así la
  opción se ve exactamente como quedará al elegirla, y no se inventan colores.
- Éxito → `notify.success` diciendo qué cambió; con una mutación en vuelo, el
  disparador queda `aria-busy`, el segundo intento se explica con
  `notify.info` (no se descarta en silencio) y la fila anuncia `aria-busy`.
- La propiedad secundaria (p. ej. prioridad) usa el mismo patrón con menor
  jerarquía visual: control de texto pequeño bajo el principal, no otra pill.

## Reglas duras (Vercel, no negociables)

- `<button>` para acciones; `<a>`/`<Link>` para navegación.
- Todo interactivo tiene estado `hover:` visible, y hover/active/focus
  **aumentan** el contraste, nunca lo bajan.
- Foco visible siempre: `focus-visible:ring-2 focus-visible:ring-brand/40`.
  PROHIBIDO `outline-none` sin reemplazo de foco.
- Label y control comparten un único hit target (sin zonas muertas). Targets
  ≥24 px (WCAG 2.2 · 2.5.8) y ≥40 px bajo `@media (pointer: coarse)`.
- Nunca bloquear `paste`. Inputs con `type`/`inputmode`/`autocomplete`
  correctos; `spellCheck={false}` en emails/códigos.
- Actualizaciones async (toasts, validación) con `aria-live="polite"` —
  `notify` (Sileo) ya lo cumple; no inventar otro canal.
- Avisar antes de navegar con cambios sin guardar.
- `touch-action: manipulation` en controles muy pulsados (evita el retardo de
  doble tap en tablet, que es el dispositivo del sillón).

## Bento (lo local)

- Cero hex y cero paleta cruda (`text-blue-500`…): tonos SIEMPRE vía
  `StatusBadge tone` o tokens semánticos
  (`canvas/surface/elevated/ink/subtle/hairline/brand/hover/info`).
- Copy es-ES, sentence case, verbos activos («Guardar cambios», no «Submit»).
  Errores y vacíos son momentos direccionales: dicen qué hacer, no un ánimo.
- Movimiento sobrio y con `prefers-reduced-motion` respetado — es el «suelo de
  calidad» de frontend-design; la animación extra es lo que hace que un diseño
  huela a generado.

## Checklist antes de cerrar un control

teclado completo · foco visible · hover en todo · menú sin scroll y solo
acciones · propiedades editables in situ sobre su valor · confirmación en
destructivas · `aria-busy`/`aria-live` en lo async · tokens, cero hex.
