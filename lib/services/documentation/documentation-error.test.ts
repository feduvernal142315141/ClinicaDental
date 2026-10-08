import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { documentationErrorMessage } from "./documentation-error";
const t = (key: string) => key;
function error(status: number, message: unknown) {
  return new AxiosError("network", "ERR_BAD_RESPONSE", undefined, undefined, { status, data: { message }, statusText: "", headers: {}, config: {} as never });
}
describe("documentation errors", () => {
  it("shows safe validation messages from the API", () => {
    expect(documentationErrorMessage(error(400, "La fuente no admite un carácter."), t)).toBe("La fuente no admite un carácter.");
    expect(documentationErrorMessage(error(422, "Revise el contenido."), t)).toBe("Revise el contenido.");
  });
  it("hides diagnostics from server failures, network errors and malformed bodies", () => {
    for (const cause of [error(500, "parser path"), error(400, {}), error(400, "x".repeat(501)), new Error("diagnostic")]) {
      expect(documentationErrorMessage(cause, t, "documentation.layoutError")).toBe("documentation.layoutError");
    }
  });
  it("retains conflict and access messages", () => {
    expect(documentationErrorMessage(error(409, "diagnostic"), t)).toBe("documentation.conflict");
    expect(documentationErrorMessage(error(403, "diagnostic"), t)).toBe("documentation.forbidden");
  });
});
