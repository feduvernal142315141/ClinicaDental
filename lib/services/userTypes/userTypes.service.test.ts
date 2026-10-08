import { beforeEach, describe, expect, it, vi } from "vitest";
import apiInstance from "@/lib/services/apiConfig";
import { userTypesService } from "./userTypes.service";
import { deriveProviderUserTypeIds } from "@/lib/entity/userType";

vi.mock("@/lib/services/apiConfig", () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

const catalog = [
  { id: "dentist", name: "Dentista", attendsAppointments: true, archived: false },
  { id: "archived", name: "Anterior", attendsAppointments: true, archived: true },
  { id: "reception", name: "Recepcionista", attendsAppointments: false, archived: false },
];

describe("read-only user type catalog", () => {
  it("preserves catalog data and provider eligibility for user forms", async () => {
    vi.mocked(apiInstance.get).mockResolvedValue({ status: 200, data: catalog });
    const types = await userTypesService.getUserTypes(true);
    expect(apiInstance.get).toHaveBeenCalledWith("/user-types?includeArchived=true", undefined);
    expect(types[1].isArchived).toBe(true);
    expect(deriveProviderUserTypeIds(types)).toEqual(new Set(["dentist"]));
  });

  it("preserves the paginated selector contract", async () => {
    const pagination = { page: 0, pageSize: 200, total: 3 };
    vi.mocked(apiInstance.get).mockResolvedValue({ status: 200, data: { entities: catalog, pagination } });
    const result = await userTypesService.getUserTypesPage({ query: " Dentista ", page: 0, pageSize: 200 });
    const params = new URL(String(vi.mocked(apiInstance.get).mock.calls[0][0]), "http://localhost").searchParams;
    expect(params.get("filters")).toBe("name__CONTAINS_IGNORE_CASE__Dentista");
    expect(params.get("pageSize")).toBe("200");
    expect(result.pagination).toEqual(pagination);
    expect(result.entities[0]).toMatchObject({ id: "dentist", isArchived: false, attendsAppointments: true });
  });
});
