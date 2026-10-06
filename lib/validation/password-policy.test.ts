import { describe, expect, it } from "vitest";
import { password as passwordSchema } from "./fields";
import {
  PASSWORD_SPECIAL_CHARACTERS,
  failedPasswordRules,
  getPasswordStrength,
  isPasswordValid,
} from "./password-policy";

/** Expresión del backend, copiada tal cual: la política del front debe decidir lo mismo. */
const BACKEND_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]).{14,}$/;

const failed = (password: string) => failedPasswordRules(password).map((rule) => rule.id);

describe("política de contraseñas (casos del backend)", () => {
  const cases: Array<[string, boolean, string]> = [
    ["Admin123!", false, "9 caracteres"],
    ["AdminClinica2026!", true, "cumple todo"],
    ["adminclinica2026!", false, "sin mayúscula"],
    ["ADMINCLINICA2026!", false, "sin minúscula"],
    ["AdminClinicaDemo!!", false, "sin número"],
    ["AdminClinica20266", false, "sin carácter especial"],
    ["AdminClinica2026 ", false, "el espacio no es carácter especial"],
    ["ÁdminClínica2026!", true, "tiene a-z y A-Z además de las tildes"],
  ];

  it.each(cases)("%s → válida: %s (%s)", (password, expected) => {
    expect(isPasswordValid(password)).toBe(expected);
    // Y coincide con la expresión del backend.
    expect(BACKEND_REGEX.test(password)).toBe(expected);
  });

  it("señala exactamente la regla que falta", () => {
    expect(failed("Admin123!")).toEqual(["length"]);
    expect(failed("adminclinica2026!")).toEqual(["uppercase"]);
    expect(failed("ADMINCLINICA2026!")).toEqual(["lowercase"]);
    expect(failed("AdminClinicaDemo!!")).toEqual(["digit"]);
    expect(failed("AdminClinica20266")).toEqual(["special"]);
    expect(failed("AdminClinica2026 ")).toEqual(["special"]);
    expect(failed("AdminClinica2026!")).toEqual([]);
  });

  it("las tildes y la ñ no cuentan como minúscula ni mayúscula", () => {
    expect(failed("ÑÁÉÍÓÚ2026!ñáéíóú")).toEqual(["lowercase", "uppercase"]);
  });

  it("solo cuentan los caracteres especiales de la lista exacta", () => {
    for (const char of PASSWORD_SPECIAL_CHARACTERS) {
      expect(isPasswordValid(`AdminClinica2026${char}`), `"${char}" debería contar`).toBe(true);
    }
    for (const char of ["¡", "€", "§", " ", "ñ", "¿", "\t"]) {
      expect(failed(`AdminClinica2026${char}`), `"${char}" no debería contar`).toEqual(["special"]);
    }
  });

  it("un salto de línea invalida la contraseña, como en el backend", () => {
    const withBreak = "AdminClinica\n2026!";
    expect(isPasswordValid(withBreak)).toBe(false);
    expect(BACKEND_REGEX.test(withBreak)).toBe(false);
  });

  it("14 caracteres exactos es válido; 13 no; el front acota a 64", () => {
    expect(isPasswordValid("AdminClini26!!")).toBe(true); // 14
    expect(isPasswordValid("AdminClin26!!")).toBe(false); // 13
    expect(isPasswordValid(`Aa1!${"x".repeat(60)}`)).toBe(true); // 64
    expect(isPasswordValid(`Aa1!${"x".repeat(61)}`)).toBe(false); // 65
  });
});

describe("indicador de fortaleza", () => {
  it('"Excelente" solo cuando cumple las cinco reglas', () => {
    expect(getPasswordStrength("AdminClinica2026!")).toMatchObject({ label: "Excelente", valid: true, met: 5 });
  });

  it('"Admin123!" ya no es "Excelente": le falta la longitud', () => {
    const strength = getPasswordStrength("Admin123!");
    expect(strength.label).not.toBe("Excelente");
    expect(strength).toMatchObject({ valid: false, met: 4, level: "good" });
  });

  it("nunca marca válida una contraseña con alguna regla pendiente", () => {
    for (const password of ["", "a", "abcABC", "abcABC123", "adminclinica2026!", "AdminClinica20266"]) {
      const strength = getPasswordStrength(password);
      expect(strength.valid).toBe(false);
      expect(strength.label).not.toBe("Excelente");
    }
  });
});

describe("schema compartido `password` (lib/validation/fields)", () => {
  it("acepta lo que acepta el backend", () => {
    expect(passwordSchema.safeParse("AdminClinica2026!").success).toBe(true);
    expect(passwordSchema.safeParse("ÁdminClínica2026!").success).toBe(true);
  });

  it("rechaza con un mensaje por cada regla que falta", () => {
    const result = passwordSchema.safeParse("Admin123!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "La contraseña debe tener entre 14 y 64 caracteres",
      ]);
    }
    const noSpecial = passwordSchema.safeParse("AdminClinica2026 ");
    expect(noSpecial.success).toBe(false);
  });

  it("vacía → obligatoria", () => {
    const result = passwordSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("La contraseña es obligatoria");
  });
});
