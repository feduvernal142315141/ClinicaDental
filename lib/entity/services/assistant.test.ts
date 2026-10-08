import { describe, expect, it } from "vitest";
import {
  assistantDescriptionPayload,
  assistantMissingInfo,
  assistantToggleBlock,
  buildAssistantProfile,
  canOfferToAssistant,
  hasAssistantControlCharacters,
  isAssistantProfileChanged,
  toSingleLine,
} from "./assistant";

describe("perfil del asistente de un servicio", () => {
  it("solo tratamientos y procedimientos pueden mostrarse", () => {
    expect(canOfferToAssistant("TREATMENT")).toBe(true);
    expect(canOfferToAssistant("PROCEDURE")).toBe(true);
    expect(canOfferToAssistant("PRODUCT")).toBe(false);
    expect(canOfferToAssistant("ADVANCE")).toBe(false);
    expect(canOfferToAssistant(undefined)).toBe(false);
  });

  it("bloquea el interruptor por tipo o por servicio inactivo", () => {
    expect(assistantToggleBlock({ type: "TREATMENT", active: true })).toBeNull();
    expect(assistantToggleBlock({ type: "PRODUCT", active: true })).toBe("type");
    expect(assistantToggleBlock({ type: "ADVANCE", active: false })).toBe("type");
    expect(assistantToggleBlock({ type: "PROCEDURE", active: false })).toBe("inactive");
  });

  it("avisa de la duración o el precio que falta solo en servicios visibles", () => {
    expect(assistantMissingInfo({ assistantVisible: false, duration: 0, cost: 0 })).toBeNull();
    expect(assistantMissingInfo({ assistantVisible: true, duration: 30, cost: 250 })).toBeNull();
    expect(assistantMissingInfo({ assistantVisible: true, duration: undefined, cost: 250 })).toBe("duration");
    expect(assistantMissingInfo({ assistantVisible: true, duration: 30, cost: 0 })).toBe("price");
    expect(assistantMissingInfo({ assistantVisible: true, duration: 0, cost: 0 })).toBe("both");
  });

  it("deja la descripción en una sola línea", () => {
    expect(hasAssistantControlCharacters("Texto normal con ñ y tildes")).toBe(false);
    expect(hasAssistantControlCharacters("uno\ndos")).toBe(true);
    expect(hasAssistantControlCharacters("uno\tdos")).toBe(true);
    expect(toSingleLine("uno\ndos\ttres")).toBe("uno dos tres");
    expect(hasAssistantControlCharacters(toSingleLine("uno\r\ndos"))).toBe(false);
  });

  it("recorta la descripción y la manda como null si queda vacía", () => {
    expect(assistantDescriptionPayload("  Aclara los dientes  ")).toBe("Aclara los dientes");
    expect(assistantDescriptionPayload("   ")).toBeNull();
    expect(assistantDescriptionPayload(null)).toBeNull();
    expect(buildAssistantProfile(true, " ")).toEqual({ assistantVisible: true, assistantDescription: null });
    expect(buildAssistantProfile(false, "Texto")).toEqual({ assistantVisible: false, assistantDescription: "Texto" });
  });

  it("detecta si la sección cambió respecto a lo guardado", () => {
    const saved = { assistantVisible: false, assistantDescription: null };
    expect(isAssistantProfileChanged(saved, { assistantVisible: false, assistantDescription: "  " })).toBe(false);
    expect(isAssistantProfileChanged(saved, { assistantVisible: true, assistantDescription: "" })).toBe(true);
    expect(isAssistantProfileChanged(saved, { assistantVisible: false, assistantDescription: "Texto" })).toBe(true);
    expect(
      isAssistantProfileChanged({ assistantVisible: true, assistantDescription: "Texto" }, { assistantVisible: true, assistantDescription: "" }),
    ).toBe(true);
  });
});
