import { describe, expect, it } from "vitest";
import { buildPatientSearchParams } from "./use-billing-catalogs";

describe("buildPatientSearchParams", () => {
  it("pide la PRIMERA página (el backend pagina desde 0)", () => {
    expect(buildPatientSearchParams("ana")).toMatchObject({ page: 0, pageSize: 20 });
  });

  it("busca por nombre con el mismo filtro estructurado que la lista de Pacientes", () => {
    expect(buildPatientSearchParams("  Ana  ").filters).toEqual(["name__CONTAINS_IGNORE_CASE__Ana"]);
  });

  it("ordena por nombre", () => {
    expect(buildPatientSearchParams("ana").orders).toHaveLength(1);
    expect(buildPatientSearchParams("ana").orders[0]).toMatch(/^name/);
  });
});
