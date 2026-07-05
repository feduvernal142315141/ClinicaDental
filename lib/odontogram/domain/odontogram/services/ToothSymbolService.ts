import type { ClinicalEvent } from "@/components/odontogram/types";
import { TREATMENT_SYMBOLS } from "../constants/odontogram-colors.constants";
import {
  VISUAL_SYMBOL_KEY_MAP,
  VISUAL_SYMBOL_PRIORITY,
} from "../constants/visual-priority.constants";

/**
 * Información de símbolo a nivel diente que el render necesita para decidir QUÉ
 * dibujar y de qué color:
 * - text: string a pintar como <text> ("ENDO", letra de tratamiento o texto del
 *   servicio). Vacío/null cuando el símbolo es una FORMA vectorial (cruz/círculo).
 * - symbolKey: clave declarativa del visualState ('cross' | 'crown_ring' | 'endo'
 *   | 'extraction' | 'implant' | ...). El render conmuta sobre ella para elegir
 *   entre forma vectorial y texto. null cuando el símbolo viene de la heurística.
 * - symbolColor: color del símbolo (canal independiente del relleno). null → el
 *   render usa su neutro por defecto.
 */
export interface ToothSymbolInfo {
  text: string | null;
  symbolKey: string | null;
  symbolColor: string | null;
}

/**
 * Texto asociado a cada symbolKey declarativo. Para 'cross'/'crown_ring' el
 * render dibuja una FORMA (no texto) → cadena vacía. 'endo' se rotula "ENDO".
 * El resto cae al mapa legacy de caracteres (X/I/E/C…).
 */
const SYMBOL_KEY_TO_TEXT: Record<string, string> = {
  cross: "",
  crown_ring: "",
  endo: "ENDO",
};

/**
 * ToothSymbolService
 * Determina qué símbolos/letras mostrar en un diente para indicar tipo de tratamiento
 */
export class ToothSymbolService {
  /**
   * Variante rica de getToothSymbol: además del texto expone el symbolKey y el
   * symbolColor del visualState ganador, para que el render sepa si debe dibujar
   * una forma vectorial (cruz de ausencia, círculo de corona) o un texto, y con
   * qué color. Respeta la MISMA precedencia que getToothSymbol:
   * serviceSymbolText → visualState.symbolKey → heurística por categoría.
   */
  static getToothSymbolInfo(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): ToothSymbolInfo {
    const empty: ToothSymbolInfo = {
      text: null,
      symbolKey: null,
      symbolColor: null,
    };
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);
    if (toothEvents.length === 0) return empty;

    // 1. Texto personalizado por servicio (misma regla que getToothSymbol): no
    //    tapa estados críticos y solo para procedimientos realizados.
    const hasCriticalState = toothEvents.some(
      (e) => e.type === "ausente" || e.type === "implante",
    );
    if (!hasCriticalState) {
      const serviceText = ToothSymbolService.pickByPriority(
        toothEvents.filter(
          (e) =>
            !!e.serviceSymbolText?.trim() &&
            e.status !== "canceled" &&
            (e.type === "performed" || e.status === "done"),
        ),
      )?.serviceSymbolText?.trim();
      if (serviceText) {
        return { text: serviceText, symbolKey: null, symbolColor: null };
      }
    }

    // 2. Símbolo declarativo del visualState (fuente del nuevo modelo a nivel
    //    diente: cross/crown_ring/endo/extraction/implant…). No se filtra por
    //    tener carácter: 'cross'/'crown_ring' son formas sin texto.
    const declarative = toothEvents
      .filter((event) => event.visualState?.symbolKey)
      .map((event) => ({
        symbolKey: event.visualState!.symbolKey as string,
        symbolColor: event.visualState?.symbolColor ?? null,
        priority:
          VISUAL_SYMBOL_PRIORITY[event.visualState?.priorityKey || "healthy"] ??
          50,
      }))
      .sort((a, b) => a.priority - b.priority);

    if (declarative.length > 0) {
      const winner = declarative[0];
      // Alias legacy→nuevo: datos viejos sin migrar (symbolKey 'endodontics'/
      // 'crown'/'extraction') se resuelven al render nuevo (ENDO/círculo/cruz)
      // en vez de las letras E/C/X del modelo anterior.
      const LEGACY_SYMBOL_ALIAS: Record<string, string> = {
        endodontics: "endo",
        crown: "crown_ring",
        extraction: "cross",
      };
      const symbolKey =
        LEGACY_SYMBOL_ALIAS[winner.symbolKey] ?? winner.symbolKey;
      const text =
        SYMBOL_KEY_TO_TEXT[symbolKey] ??
        VISUAL_SYMBOL_KEY_MAP[symbolKey] ??
        null;
      return {
        text: text === "" ? null : text,
        symbolKey,
        symbolColor: winner.symbolColor,
      };
    }

    // 3. Heurística por categoría (sin symbolKey): reutiliza getToothSymbol.
    return {
      text: ToothSymbolService.getToothSymbol(toothNumber, allEvents),
      symbolKey: null,
      symbolColor: null,
    };
  }

  /**
   * Obtiene el símbolo principal a mostrar en un diente
   * Retorna null si no hay símbolo que mostrar
   */
  static getToothSymbol(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): string | null {
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);

    if (toothEvents.length === 0) {
      return null;
    }

    // Símbolo de TEXTO personalizado por servicio. Reglas (seguras clínicamente):
    // - NO se antepone a estados críticos del diente (ausente "X" / implante "I").
    // - Solo para procedimientos REALIZADOS (type "performed" o status "done"),
    //   igual que la heurística legacy (un plan sin realizar no pinta símbolo).
    // Si aplica, prevalece sobre la letra genérica derivada de categoría.
    const hasCriticalState = toothEvents.some(
      (e) => e.type === "ausente" || e.type === "implante",
    );
    if (!hasCriticalState) {
      const serviceText = ToothSymbolService.pickByPriority(
        toothEvents.filter(
          (e) =>
            !!e.serviceSymbolText?.trim() &&
            e.status !== "canceled" &&
            (e.type === "performed" || e.status === "done"),
        ),
      )?.serviceSymbolText?.trim();
      if (serviceText) {
        return serviceText;
      }
    }

    const declarativeSymbols = toothEvents
      .filter((event) => event.visualState?.symbolKey)
      .map((event) => ({
        event,
        symbol: VISUAL_SYMBOL_KEY_MAP[event.visualState?.symbolKey || ""],
        priority:
          VISUAL_SYMBOL_PRIORITY[event.visualState?.priorityKey || "healthy"] ??
          50,
      }))
      .filter((entry) => entry.symbol)
      .sort((a, b) => a.priority - b.priority);

    if (declarativeSymbols.length > 0) {
      return declarativeSymbols[0].symbol;
    }

    // PRIORIDAD DE SÍMBOLOS (de mayor a menor importancia visual)

    // 1. EXTRACCIÓN/AUSENTE - X
    const hasExtraction = toothEvents.some((e) => e.type === "ausente");
    if (hasExtraction) {
      return TREATMENT_SYMBOLS.EXTRACTION.symbol;
    }

    // 2. IMPLANTE - I
    const hasImplant = toothEvents.some((e) => e.type === "implante");
    if (hasImplant) {
      return TREATMENT_SYMBOLS.IMPLANT.symbol;
    }

    // 3. ENDODONCIA - E (tratamiento de conducto)
    const hasEndo = toothEvents.some(
      (e) =>
        e.type === "endo" ||
        e.category?.includes("endodoncia") ||
        e.procedureName?.toLowerCase().includes("endodoncia"),
    );
    if (hasEndo) {
      return TREATMENT_SYMBOLS.ENDODONTICS.symbol;
    }

    // 4. CORONA/PRÓTESIS FIJA - C
    const hasCrown = toothEvents.some(
      (e) =>
        (e.category === "protesis" ||
          e.procedureName?.toLowerCase().includes("corona")) &&
        (e.type === "performed" || e.status === "done"),
    );
    if (hasCrown) {
      return TREATMENT_SYMBOLS.CROWN.symbol;
    }

    // 5. PUENTE - B
    const hasBridge = toothEvents.some(
      (e) =>
        e.procedureName?.toLowerCase().includes("puente") ||
        e.notes?.toLowerCase().includes("puente"),
    );
    if (hasBridge) {
      return TREATMENT_SYMBOLS.BRIDGE.symbol;
    }

    // 6. RESTAURACIÓN COMPLETADA - R
    const hasRestoration = toothEvents.some(
      (e) =>
        e.category === "restaurador" &&
        (e.type === "performed" || e.status === "done"),
    );
    if (hasRestoration) {
      return TREATMENT_SYMBOLS.RESTORATION.symbol;
    }

    // 7. PREVENTIVO APLICADO - P
    const hasPreventive = toothEvents.some(
      (e) =>
        e.category === "preventivo" &&
        (e.type === "performed" || e.status === "done"),
    );
    if (hasPreventive) {
      return TREATMENT_SYMBOLS.PREVENTIVE.symbol;
    }

    // Si solo hay diagnóstico o plan sin realizar, no mostrar símbolo
    return null;
  }

  /**
   * Elige el evento "ganador" de un conjunto por prioridad visual y, a igualdad,
   * por recencia (updatedAt desc). Devuelve undefined si el conjunto está vacío.
   */
  private static pickByPriority(
    events: ClinicalEvent[],
  ): ClinicalEvent | undefined {
    if (events.length === 0) return undefined;
    return [...events].sort((a, b) => {
      const pa =
        VISUAL_SYMBOL_PRIORITY[a.visualState?.priorityKey || "healthy"] ?? 50;
      const pb =
        VISUAL_SYMBOL_PRIORITY[b.visualState?.priorityKey || "healthy"] ?? 50;
      if (pa !== pb) return pa - pb;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })[0];
  }

  /**
   * Imagen (URL) del símbolo personalizado por servicio (modo ASSET) a dibujar
   * en el diente. La imagen tiene precedencia sobre el texto en el render.
   * Devuelve null si ningún servicio aplicado define una imagen.
   */
  static getToothSymbolImage(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): string | null {
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);
    // No tapar estados críticos (ausente/implante) ni pintar planes sin realizar.
    const hasCriticalState = toothEvents.some(
      (e) => e.type === "ausente" || e.type === "implante",
    );
    if (hasCriticalState) return null;
    const winner = ToothSymbolService.pickByPriority(
      toothEvents.filter(
        (e) =>
          !!e.serviceSymbolUrl?.trim() &&
          e.status !== "canceled" &&
          (e.type === "performed" || e.status === "done"),
      ),
    );
    return winner?.serviceSymbolUrl?.trim() || null;
  }

  /**
   * Obtiene todos los símbolos aplicables a un diente (para tooltip o detalles)
   */
  static getAllToothSymbols(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): Array<{
    symbol: string;
    description: string;
    type: keyof typeof TREATMENT_SYMBOLS;
  }> {
    const toothEvents = allEvents.filter((e) => e.toothNumber === toothNumber);
    const symbols: Array<{
      symbol: string;
      description: string;
      type: keyof typeof TREATMENT_SYMBOLS;
    }> = [];

    if (toothEvents.some((e) => e.type === "ausente")) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.EXTRACTION.symbol,
        description: TREATMENT_SYMBOLS.EXTRACTION.description,
        type: "EXTRACTION",
      });
    }

    if (toothEvents.some((e) => e.type === "implante")) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.IMPLANT.symbol,
        description: TREATMENT_SYMBOLS.IMPLANT.description,
        type: "IMPLANT",
      });
    }

    if (
      toothEvents.some((e) => e.type === "endo" || e.category === "endodoncia")
    ) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.ENDODONTICS.symbol,
        description: TREATMENT_SYMBOLS.ENDODONTICS.description,
        type: "ENDODONTICS",
      });
    }

    if (
      toothEvents.some(
        (e) =>
          e.category === "protesis" &&
          (e.type === "performed" || e.status === "done"),
      )
    ) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.CROWN.symbol,
        description: TREATMENT_SYMBOLS.CROWN.description,
        type: "CROWN",
      });
    }

    if (
      toothEvents.some(
        (e) =>
          e.category === "restaurador" &&
          (e.type === "performed" || e.status === "done"),
      )
    ) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.RESTORATION.symbol,
        description: TREATMENT_SYMBOLS.RESTORATION.description,
        type: "RESTORATION",
      });
    }

    if (
      toothEvents.some(
        (e) =>
          e.category === "preventivo" &&
          (e.type === "performed" || e.status === "done"),
      )
    ) {
      symbols.push({
        symbol: TREATMENT_SYMBOLS.PREVENTIVE.symbol,
        description: TREATMENT_SYMBOLS.PREVENTIVE.description,
        type: "PREVENTIVE",
      });
    }

    return symbols;
  }

  /**
   * Determina si un diente debe mostrar alguna marca especial
   */
  static shouldShowSymbol(
    toothNumber: number,
    allEvents: ClinicalEvent[],
  ): boolean {
    return this.getToothSymbol(toothNumber, allEvents) !== null;
  }

  /**
   * Obtiene el color del símbolo (normalmente contraste con el fondo)
   */
  static getSymbolColor(backgroundColor: string): string {
    // Si el fondo es oscuro, usar blanco; si es claro, usar negro
    // Colores oscuros: ausente (#424242), endodoncia (#D32F2F), implante (#9C27B0)
    const darkBackgrounds = [
      "#424242",
      "#D32F2F",
      "#B91C1C",
      "#991B1B",
      "#9C27B0",
      "#1E88E5",
      "#EF5350",
      "#F44336",
    ];

    if (darkBackgrounds.some((dark) => backgroundColor.includes(dark))) {
      return "#FFFFFF";
    }

    return "#000000";
  }
}
