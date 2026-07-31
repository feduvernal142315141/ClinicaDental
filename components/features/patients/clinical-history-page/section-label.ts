/**
 * Micro-etiqueta de sección de la Historia Clínica (el `ANTECEDENTES`,
 * `CITAS`, `MOTIVO` … en versalitas sobre cada bloque).
 *
 * La misma cadena estaba escrita a mano once veces en cinco ficheros de esta
 * vista, con dos variantes divergentes (`tracking-wider` vs `tracking-widest`)
 * y usando `text-muted-foreground` en lugar del token semántico `text-subtle`.
 * Sigue el precedente de `ODONTOGRAM_FIELD_LABEL_CLASS`, que unificó seis
 * recetas del mismo elemento en el odontograma.
 *
 * Es una **constante, no un componente**: se aplica al `<h3>`/`<label>`/`<span>`
 * que ya existe, sin envolver nada ni cambiar la semántica del marcado.
 * Combínala con `cn()` cuando el sitio necesite márgenes o `block` propios.
 *
 * @example
 * import { cn } from "@/lib/utils/utils";
 * import { SECTION_LABEL_CLASS } from "./section-label";
 *
 * <h3 className={SECTION_LABEL_CLASS}>Antecedentes médicos</h3>
 * <label className={cn(SECTION_LABEL_CLASS, "mb-1 block")} htmlFor="alergias">
 *   Alergias
 * </label>
 */
export const SECTION_LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-widest text-subtle";
