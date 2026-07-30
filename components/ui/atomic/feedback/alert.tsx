import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/utils'

/**
 * Alert — banner de aviso compartido (Bento 2026).
 *
 * Componente ÚNICO para avisos en bloque. Antes de escribir un `<div>` con
 * `bg-amber-500/15 …` a mano, usa una variante de aquí: es lo que mantiene
 * homogéneos los avisos de toda la app.
 *
 * Variantes:
 * - `default`     — neutro sobre tarjeta (descripción en gris).
 * - `destructive` — error / bloqueo.
 * - `warning`     — advertencia clínica (ámbar). La más usada en odontograma.
 * - `info`        — informativo / sugerencia (token `info`, cian del sistema).
 * - `success`     — confirmación (esmeralda).
 *
 * Las variantes de color usan la receta dual-tema del proyecto
 * (`bg-X-500/15` + `text-X-600 dark:text-X-300` + `border-X-400/25`), así que
 * se leen bien en claro Y en oscuro sin tocar nada. `info` usa directamente el
 * token semántico `info`, que ya invierte solo por tema.
 *
 * El icono (opcional, `lucide-react`) va como PRIMER hijo directo y hereda el
 * color de la variante; el grid deja su columna automáticamente.
 *
 * @example Advertencia clínica
 * <Alert variant="warning">
 *   <TriangleAlert />
 *   <AlertTitle>Incoherencia entre superficies</AlertTitle>
 *   <AlertDescription>
 *     Hay caries registrada en una cara ya restaurada. Revísalo antes de guardar.
 *   </AlertDescription>
 * </Alert>
 *
 * @example Informativo permanente (texto fijo, no un anuncio)
 * <Alert variant="info" live={false}>
 *   <Info />
 *   <AlertDescription>
 *     El plan se guarda automáticamente al salir de cada campo.
 *   </AlertDescription>
 * </Alert>
 *
 * @example Éxito
 * <Alert variant="success">
 *   <CheckCircle2 />
 *   <AlertTitle>Visita finalizada</AlertTitle>
 * </Alert>
 *
 * @example Error
 * <Alert variant="destructive">
 *   <TriangleAlert />
 *   <AlertTitle>No se pudo guardar</AlertTitle>
 *   <AlertDescription>{error}</AlertDescription>
 * </Alert>
 *
 * @example Neutro
 * <Alert>
 *   <AlertTitle>Sin datos</AlertTitle>
 * </Alert>
 */
const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        // El tono -700 en claro NO es cosmético: sobre el tinte al 15% el -600
        // se queda en ~2,8:1 y no llega ni al mínimo de texto grande. En oscuro
        // manda el -300, que ya iba sobrado. Misma razón para `cyan-700` en
        // `info`: el token `--accent-ch` en claro es cyan-600 (~3,1:1), válido
        // como color de acento pero no como color de TEXTO.
        //
        // `destructive` lleva tinte propio en vez de `bg-card`: `--destructive`
        // está declarado IGUAL en `:root` y en `.dark` (globals.css:25 y :91),
        // así que es el único color de la paleta que no invierte — sobre el
        // `--card` navy del tema oscuro daba 2,5:1, ilegible.
        //
        // Las variantes de color fuerzan `text-current` en la descripción para
        // ganarle en especificidad al `text-muted-foreground` de base
        // (`.variant > *[data-slot]` = 0,2,0 vs `.text-muted-foreground` = 0,1,0),
        // que si no dejaría la descripción gris dentro de un aviso de color.
        destructive:
          'border-rose-400/25 bg-rose-500/15 text-rose-700 dark:text-rose-300 [&>svg]:text-current *:data-[slot=alert-description]:text-current',
        warning:
          'border-amber-400/25 bg-amber-500/15 text-amber-700 dark:text-amber-300 *:data-[slot=alert-description]:text-current',
        info: 'border-info/25 bg-info/15 text-cyan-700 dark:text-info *:data-[slot=alert-description]:text-current',
        success:
          'border-emerald-400/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 *:data-[slot=alert-description]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * @param live - `true` (por defecto) usa `role="alert"`, una región
 *   `aria-live="assertive"`: correcto para un aviso que APARECE por un cambio
 *   de estado (error de guardado, incoherencia detectada al editar).
 *   Pásale `false` cuando el aviso sea texto informativo PERMANENTE que ya está
 *   en pantalla al montar: se degrada a `role="note"` y deja de interrumpir al
 *   lector de pantalla. También puedes pasar `role` explícito (p. ej.
 *   `role="status"` para un aviso poco urgente) y tiene prioridad sobre `live`.
 */
function Alert({
  className,
  variant,
  live = true,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof alertVariants> & { live?: boolean }) {
  return (
    <div
      data-slot="alert"
      role={live ? 'alert' : 'note'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Descripción del aviso. El gris de base solo se aplica en la variante
 * `default`: el resto de variantes lo sobreescriben para heredar su propio
 * color (ver comentario en `alertVariants`).
 */
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
