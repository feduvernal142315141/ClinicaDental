import * as React from "react";

/** `2xl` de Tailwind. Es el ancho a partir del cual caben dos superficies útiles. */
const WIDE_DESKTOP_BREAKPOINT = 1536;

/**
 * ¿Estamos en una pantalla lo bastante ancha para trabajar con dos superficies a
 * la vez (odontograma + evolución)?
 *
 * Se resuelve en JS y no con clases `2xl:` a propósito: la columna lateral monta
 * un editor TipTap, y con CSS el editor estaría MONTADO aunque invisible en toda
 * pantalla menor — una segunda instancia viva sobre la misma nota, que es
 * justamente lo que no puede pasar.
 *
 * Devuelve `false` en el primer render (igual que `useIsMobile`) y se corrige en
 * el efecto: el store de la consulta persiste en localStorage sin
 * `skipHydration`, así que decidir el layout antes de montar produciría un
 * desajuste de hidratación.
 */
export function useIsWideDesktop() {
  const [isWide, setIsWide] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${WIDE_DESKTOP_BREAKPOINT}px)`,
    );
    const onChange = () => setIsWide(window.innerWidth >= WIDE_DESKTOP_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isWide;
}
