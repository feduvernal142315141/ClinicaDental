"use client";

import { useEffect } from "react";

/**
 * Selector de capa Radix ABIERTA.
 *
 * Deliberadamente GENEROSO: si dudamos, preferimos concluir que hay una capa
 * abierta y no tocar nada. Equivocarse por exceso deja el estado como está (el
 * usuario recarga, que es lo que hace hoy); equivocarse por defecto
 * desbloquearía el fondo de un modal legítimamente abierto, que es peor.
 *
 * Cubre las capas que Radix marca como modales y que por tanto apagan los
 * eventos de puntero del resto de la página: Dialog, AlertDialog, los menús
 * (dropdown / context / menubar) y el Select.
 */
const OPEN_LAYER_SELECTOR = [
  '[data-state="open"][role="dialog"]',
  '[data-state="open"][role="alertdialog"]',
  '[data-state="open"][role="menu"]',
  '[data-state="open"][role="listbox"]',
  "[data-radix-popper-content-wrapper] [data-state=\"open\"]",
].join(", ");

/**
 * PointerEventsGuard — desatasca el `<body>` cuando Radix lo deja bloqueado.
 *
 * ## El fallo que arregla
 *
 * `node_modules` contiene DIEZ instancias físicas distintas de
 * `@radix-ui/react-dismissable-layer` (la de nivel superior más una anidada
 * bajo `react-alert-dialog`, `react-dropdown-menu`, `react-select`,
 * `react-context-menu`, `react-menubar`…, todas clavadas en 1.1.3 de forma
 * exacta). Cada instancia tiene su PROPIA variable de módulo
 * `originalBodyPointerEvents` y su propio `Set` de capas, pero todas escriben
 * el MISMO `document.body.style.pointerEvents`.
 *
 * Cuando una capa de una instancia se abre encima de una capa de otra, la
 * segunda guarda `"none"` creyendo que es "el valor original" del body. Al
 * cerrarse ambas, esa segunda instancia vuelve a estampar su `"none"` y ya no
 * queda nadie que lo revierta: **la aplicación entera deja de recibir clics
 * hasta recargar la página**.
 *
 * Reproducido en runtime (Pacientes → menú ⋯ → diálogo de confirmación →
 * Cancelar), con esta traza del `<body>`:
 *
 *   menú abierto           → pointer-events: none   (capas: popper, menu)
 *   diálogo abierto encima → pointer-events: ""     (capas: popper, menu, alertdialog)
 *   TODO cerrado           → pointer-events: none   (capas: NINGUNA)  ← atascado
 *
 * No hace falta el odontograma ni el botón atrás: pasa en la lista de
 * pacientes, que es de uso diario. Se reproduce igual con cualquier menú ⋯
 * que abra un diálogo encima.
 *
 * ## Por qué este arreglo y no deduplicar Radix
 *
 * La cura de raíz es que exista UNA sola instancia del módulo, pero yarn 1
 * rechaza la `resolution` ("is incompatible with requested version 1.1.3")
 * porque los paquetes anidados clavan la versión exacta: haría falta subir
 * ocho paquetes de Radix, con su propia tanda de verificación. Mientras tanto
 * esta guarda es pequeña y su condición es DEMOSTRABLE: si no hay ninguna capa
 * abierta, un `pointer-events: none` en el body no lo puede haber puesto nadie
 * con motivo.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const body = document.body;

    const unstickIfOrphaned = () => {
      if (body.style.pointerEvents !== "none") return;
      if (document.querySelector(OPEN_LAYER_SELECTOR)) return;
      body.style.removeProperty("pointer-events");
    };

    // Se comprueba en el frame SIGUIENTE: durante el commit en el que una capa
    // se cierra y otra se abre hay un instante con el body ya bloqueado y la
    // nueva capa todavía sin montar. Mirar en ese punto daría un falso
    // "huérfano" y desbloquearía el fondo de un modal que sí está abriéndose.
    let frame = 0;
    const scheduleCheck = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(unstickIfOrphaned);
      });
    };

    const observer = new MutationObserver(scheduleCheck);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    // También al montar/desmontar capas: el bloqueo sobrevive al portal.
    observer.observe(body, { childList: true, subtree: true });

    scheduleCheck();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
