import { describe, expect, it } from "vitest";
import {
  audienceCountLabel,
  buildSegmentConditions,
  campaignTemplateVariableCount,
  coerceSegmentValue,
  excludedWithoutNameMessage,
  formatSegmentCondition,
  isTemplateSupportedForLeads,
  segmentAudience,
  segmentFieldChoices,
  segmentOperatorLabel,
  sortSegmentOperators,
  validateSegmentCondition,
  type SegmentFieldDefinition,
} from "@/lib/entity/growth";

/** Catalog as `GET /patient-segments/fields?audience=LEAD` sends it (operators alphabetically). */
const LEAD_FIELDS: SegmentFieldDefinition[] = [
  { field: "stage", valueType: "STRING", operators: ["EQ", "IN"], allowedValues: ["NEW", "CONTACTED", "QUALIFIED"] },
  { field: "temperature", valueType: "STRING", operators: ["EQ", "IN", "IS_NULL"], allowedValues: ["COLD", "WARM", "HOT"] },
  { field: "sourceCampaign", valueType: "STRING", operators: ["EQ", "IN", "IS_NULL"], allowedValues: [] },
  { field: "interestServiceId", valueType: "UUID", operators: ["EQ", "IN", "IS_NULL"], allowedValues: [] },
  { field: "assignedToUserId", valueType: "UUID", operators: ["EQ", "IN", "IS_NULL"], allowedValues: [] },
  { field: "daysSinceCreation", valueType: "INTEGER", operators: ["EQ", "GT", "GTE", "LT", "LTE"], allowedValues: [] },
  { field: "hasOverdueFollowUp", valueType: "BOOLEAN", operators: ["EQ"], allowedValues: [] },
];

const PATIENT_FIELDS: SegmentFieldDefinition[] = [
  { field: "birthdayMonth", valueType: "INTEGER", operators: ["EQ", "IN"], allowedValues: [] },
  { field: "age", valueType: "INTEGER", operators: ["BETWEEN", "EQ", "GT", "GTE", "LT", "LTE"], allowedValues: [] },
  { field: "totalServiceValue", valueType: "DECIMAL", operators: ["EQ", "GT"], allowedValues: [] },
];

const field = (name: string) => [...LEAD_FIELDS, ...PATIENT_FIELDS].find((f) => f.field === name)!;

describe("audiencia del segmento", () => {
  it("lo que falta o no se conoce es una audiencia de pacientes", () => {
    expect(segmentAudience(undefined)).toBe("PATIENT");
    expect(segmentAudience(null)).toBe("PATIENT");
    expect(segmentAudience("OTRA")).toBe("PATIENT");
    expect(segmentAudience("LEAD")).toBe("LEAD");
  });

  it("nombra a un lead como prospecto", () => {
    expect(audienceCountLabel("LEAD", 12)).toBe("12 prospectos");
    expect(audienceCountLabel("LEAD", 1)).toBe("1 prospecto");
    expect(audienceCountLabel("PATIENT", 1)).toBe("1 paciente");
    expect(excludedWithoutNameMessage(3)).toBe(
      "3 prospectos no tienen nombre; no recibirán una plantilla que salude por nombre.",
    );
  });
});

describe("valores tipados para el backend", () => {
  it("un entero escrito como texto se envía como número", () => {
    expect(coerceSegmentValue(field("daysSinceCreation"), "GTE", "7")).toBe(7);
    expect(coerceSegmentValue(field("daysSinceCreation"), "GTE", 7)).toBe(7);
  });

  it("un booleano como texto se envía como booleano", () => {
    expect(coerceSegmentValue(field("hasOverdueFollowUp"), "EQ", "true")).toBe(true);
    expect(coerceSegmentValue(field("hasOverdueFollowUp"), "EQ", false)).toBe(false);
  });

  it("IN conserva el tipo de cada valor y quita repetidos", () => {
    expect(coerceSegmentValue(field("birthdayMonth"), "IN", ["7", "8", "7"])).toEqual([7, 8]);
    expect(coerceSegmentValue(field("stage"), "IN", ["NEW", "CONTACTED"])).toEqual(["NEW", "CONTACTED"]);
  });

  it("IS_NULL va sin valor", () => {
    expect(coerceSegmentValue(field("temperature"), "IS_NULL", "HOT")).toBeUndefined();
    const { conditions, errors } = buildSegmentConditions(
      [{ field: "assignedToUserId", operator: "IS_NULL", value: "" }],
      LEAD_FIELDS,
    );
    expect(errors).toEqual([]);
    expect(conditions).toEqual([{ field: "assignedToUserId", operator: "IS_NULL" }]);
    expect("value" in conditions[0]).toBe(false);
  });

  it("arma un segmento de prospectos con cada tipo de campo", () => {
    const { conditions, errors } = buildSegmentConditions(
      [
        { field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] },
        { field: "temperature", operator: "IS_NULL", value: "" },
        { field: "sourceCampaign", operator: "EQ", value: "  verano  " },
        { field: "interestServiceId", operator: "IN", value: ["service-1"] },
        { field: "daysSinceCreation", operator: "GT", value: "30" },
        { field: "hasOverdueFollowUp", operator: "EQ", value: true },
      ],
      LEAD_FIELDS,
    );
    expect(errors).toEqual([]);
    expect(conditions).toEqual([
      { field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] },
      { field: "temperature", operator: "IS_NULL" },
      { field: "sourceCampaign", operator: "EQ", value: "verano" },
      { field: "interestServiceId", operator: "IN", value: ["service-1"] },
      { field: "daysSinceCreation", operator: "GT", value: 30 },
      { field: "hasOverdueFollowUp", operator: "EQ", value: true },
    ]);
  });
});

describe("validación de una condición", () => {
  const check = (name: string, operator: string, value?: unknown, fields = [...LEAD_FIELDS, ...PATIENT_FIELDS]) =>
    buildSegmentConditions([{ field: name, operator, value: value as never }], fields).errors[0]?.error ?? null;

  it("acepta condiciones bien formadas", () => {
    expect(check("stage", "EQ", "NEW")).toBeNull();
    expect(check("daysSinceCreation", "EQ", 0)).toBeNull();
    expect(check("age", "BETWEEN", [18, 30])).toBeNull();
    expect(check("totalServiceValue", "GT", "150.5")).toBeNull();
  });

  it("IN pide de 1 a 50 valores", () => {
    expect(check("stage", "IN", [])?.message).toBe("Elige al menos un valor");
    const many = Array.from({ length: 51 }, (_, index) => `campaña-${index}`);
    expect(check("sourceCampaign", "IN", many)?.message).toBe("Elige como máximo 50 valores");
    expect(check("sourceCampaign", "IN", many.slice(0, 50))).toBeNull();
  });

  it("rechaza enteros negativos, decimales y texto en un campo entero", () => {
    expect(check("daysSinceCreation", "GT", -1)?.target).toBe("value");
    expect(check("daysSinceCreation", "GT", 2.5)?.target).toBe("value");
    expect(check("daysSinceCreation", "GT", "abc")?.target).toBe("value");
    expect(check("daysSinceCreation", "GT", "")?.message).toBe("El valor es obligatorio");
  });

  it("rechaza un valor fuera de la lista cerrada del campo", () => {
    expect(check("stage", "EQ", "CONVERTED")?.message).toBe("Elige un valor de la lista");
  });

  it("rechaza un operador que el campo no admite y un rango invertido", () => {
    expect(check("stage", "GT", "NEW")?.target).toBe("operator");
    expect(check("age", "BETWEEN", [40, 18])?.target).toBe("value");
  });

  it("un campo de la otra audiencia se marca en el campo", () => {
    expect(check("stage", "EQ", "NEW", PATIENT_FIELDS)).toEqual({
      target: "field",
      message: "Este campo no está disponible para la audiencia del segmento",
    });
    expect(validateSegmentCondition(undefined, { field: "", operator: "" })?.target).toBe("field");
  });
});

describe("textos del constructor", () => {
  it("ordena los operadores que el catálogo manda alfabéticamente", () => {
    expect(sortSegmentOperators(["EQ", "GT", "GTE", "IN", "IS_NULL", "LT", "LTE"])).toEqual([
      "EQ", "IN", "GT", "GTE", "LT", "LTE", "IS_NULL",
    ]);
  });

  it("IS_NULL se lee según el campo", () => {
    expect(segmentOperatorLabel("temperature", "IS_NULL")).toBe("sin clasificar");
    expect(segmentOperatorLabel("assignedToUserId", "IS_NULL")).toBe("sin asignar");
    expect(segmentOperatorLabel("sourceCampaign", "IS_NULL")).toBe("está vacío");
  });

  it("usa los valores del catálogo, o los meses para el cumpleaños", () => {
    expect(segmentFieldChoices(field("stage"))).toEqual(["NEW", "CONTACTED", "QUALIFIED"]);
    expect(segmentFieldChoices(field("birthdayMonth"))).toHaveLength(12);
    expect(segmentFieldChoices(field("sourceCampaign"))).toBeNull();
  });

  it("describe una condición guardada con etiquetas en español", () => {
    expect(formatSegmentCondition({ field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] })).toBe(
      "Etapa está en Nuevo, Contactado",
    );
    expect(formatSegmentCondition({ field: "temperature", operator: "IS_NULL" })).toBe("Temperatura sin clasificar");
    expect(formatSegmentCondition({ field: "hasOverdueFollowUp", operator: "EQ", value: true })).toBe(
      "Tiene seguimiento vencido es igual a Sí",
    );
    expect(
      formatSegmentCondition({ field: "interestServiceId", operator: "EQ", value: "service-1" }, (_, id) =>
        id === "service-1" ? "Implante dental" : undefined,
      ),
    ).toBe("Servicio de interés es igual a Implante dental");
    expect(formatSegmentCondition({ field: "campoNuevo", operator: "EQ", value: "x" })).toBe("campoNuevo es igual a x");
  });
});

describe("variables de la plantilla en campañas a prospectos", () => {
  it("cuenta la variable más alta, igual que el backend", () => {
    expect(campaignTemplateVariableCount("Hola {{1}}, te escribe {{2}}")).toBe(2);
    expect(campaignTemplateVariableCount("Hola {{1}}, tu cita es el {{3}}")).toBe(3);
    expect(campaignTemplateVariableCount("Sin variables")).toBe(0);
    expect(campaignTemplateVariableCount(undefined)).toBe(0);
  });

  it("admite hasta dos variables", () => {
    expect(isTemplateSupportedForLeads("Hola {{1}}, te escribe {{2}}")).toBe(true);
    expect(isTemplateSupportedForLeads("{{1}} {{2}} {{3}}")).toBe(false);
  });
});
