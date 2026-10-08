import { describe, expect, it } from "vitest";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import {
  EMPTY_LEAD_FILTERS,
  countActiveLeadFilters,
  localDayStartIso,
  parseLeadFilters,
  parseLeadPage,
  parseLeadView,
  serializeLeadFilters,
  toLeadApiFilters,
} from "./lead-filters";
import { resolveLeadPermissions } from "./use-lead-permissions";

const { CREATE, EDIT, DELETE } = PermissionAction;

describe("permisos de Adquisición de pacientes", () => {
  it("sin ninguna acción sobre `leads` no se ve el módulo", () => {
    expect(resolveLeadPermissions({ patients: 15 }, false)).toEqual({
      canView: false,
      canCreate: false,
      canEdit: false,
      canArchive: false,
      canManage: false,
    });
  });

  it("cualquier acción sobre `leads` permite ver (no existe permiso de solo lectura)", () => {
    expect(resolveLeadPermissions({ leads: DELETE }, false)).toMatchObject({
      canView: true,
      canCreate: false,
      canEdit: false,
      canArchive: true,
    });
    expect(resolveLeadPermissions({ leads: CREATE }, false)).toMatchObject({ canView: true, canCreate: true, canEdit: false });
    expect(resolveLeadPermissions({ leads: CREATE | EDIT }, false)).toMatchObject({ canCreate: true, canEdit: true, canArchive: false });
  });

  it("`leads_manage` EDIT habilita gestionar, pero no da acceso por sí solo", () => {
    expect(resolveLeadPermissions({ leads: EDIT, leads_manage: EDIT }, false).canManage).toBe(true);
    expect(resolveLeadPermissions({ leads: EDIT, leads_manage: CREATE }, false).canManage).toBe(false);
    expect(resolveLeadPermissions({ leads_manage: EDIT }, false).canView).toBe(false);
  });

  it("el Administrador ve y hace todo", () => {
    expect(resolveLeadPermissions({}, true)).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canArchive: true,
      canManage: true,
    });
  });
});

describe("filtros en la URL", () => {
  const read = (query: string) => new URLSearchParams(query);

  it("ida y vuelta", () => {
    const state = {
      ...EMPTY_LEAD_FILTERS,
      q: "ana",
      temperature: "HOT" as const,
      source: "WHATSAPP" as const,
      assignee: "none",
      overdue: true,
    };
    const query = serializeLeadFilters(state, "board");
    expect(parseLeadFilters(read(query))).toEqual(state);
    expect(parseLeadView(read(query))).toBe("board");
    expect(parseLeadView(read("view=list"))).toBe("list");
    expect(parseLeadPage(read("page=3"))).toBe(3);
    expect(parseLeadPage(read("page=-1"))).toBe(0);
  });

  it("descarta valores que no son del contrato", () => {
    expect(parseLeadFilters(read("stage=INVENTADA&temperature=HIRVIENDO&source=TIKTOK&createdFrom=ayer"))).toEqual(
      EMPTY_LEAD_FILTERS,
    );
  });

  it("la etapa solo viaja en la vista de lista", () => {
    const state = { ...EMPTY_LEAD_FILTERS, stage: "NEW" as const };
    expect(serializeLeadFilters(state, "board")).toBe("");
    expect(serializeLeadFilters(state, "list", 2)).toBe("view=list&stage=NEW&page=2");
    expect(toLeadApiFilters(state)).toEqual({});
    expect(toLeadApiFilters(state, { includeStage: true })).toEqual({ stage: "NEW" });
    expect(countActiveLeadFilters(state, "board")).toBe(0);
    expect(countActiveLeadFilters(state, "list")).toBe(1);
  });

  it("'sin clasificar' y 'sin asignar' se traducen a sus booleanos", () => {
    expect(toLeadApiFilters({ ...EMPTY_LEAD_FILTERS, temperature: "none", assignee: "none" })).toEqual({
      unclassified: true,
      unassigned: true,
    });
    expect(toLeadApiFilters({ ...EMPTY_LEAD_FILTERS, assignee: "user-1", match: true })).toEqual({
      assignedToUserId: "user-1",
      pendingPatientMatch: true,
    });
  });

  it("las fechas viajan como instante completo y el 'hasta' es exclusivo (día siguiente)", () => {
    const filters = toLeadApiFilters({ ...EMPTY_LEAD_FILTERS, createdFrom: "2026-10-07", createdTo: "2026-10-07" });
    expect(filters.createdFrom).toBe(new Date(2026, 9, 7).toISOString());
    expect(filters.createdTo).toBe(new Date(2026, 9, 8).toISOString());
    expect(filters.createdFrom).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(localDayStartIso("07/10/2026")).toBeUndefined();
  });
});
