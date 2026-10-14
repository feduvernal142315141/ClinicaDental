import { describe, expect, it } from "vitest";
import {
  CLINIC_MODULES,
  getRouteModuleRequirement,
  missingModules,
} from "./clinic-modules";

describe("clinic module route requirements", () => {
  it("matches nested routes against the most specific module", () => {
    expect(getRouteModuleRequirement("/settings/services/new")?.allOf).toEqual([
      CLINIC_MODULES.CORE_SERVICES,
    ]);
    expect(getRouteModuleRequirement("/growth/segments/new")?.allOf).toEqual([
      CLINIC_MODULES.MARKETING_SEGMENTS,
    ]);
    expect(getRouteModuleRequirement("/patients/patient-1")?.allOf).toEqual([
      CLINIC_MODULES.CORE_PATIENTS,
      CLINIC_MODULES.CORE_CLINICAL_HISTORY,
    ]);
    expect(getRouteModuleRequirement("/patients/patient-1/edit")?.allOf).toEqual([
      CLINIC_MODULES.CORE_PATIENTS,
    ]);
  });

  it("does not gate public and unrelated routes", () => {
    expect(getRouteModuleRequirement("/login")).toBeNull();
    expect(getRouteModuleRequirement("/firmar-documento")).toBeNull();
  });

  it("reports every missing required module", () => {
    const requirement = getRouteModuleRequirement("/documentation/templates/new");
    expect(requirement).not.toBeNull();
    expect(missingModules([], requirement!)).toEqual([CLINIC_MODULES.DOCUMENTATION]);
    expect(missingModules([CLINIC_MODULES.DOCUMENTATION], requirement!)).toEqual([]);
  });
});
