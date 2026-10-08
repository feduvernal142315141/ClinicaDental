import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHookWithQuery, renderWithQuery } from "@/components/features/leads/__tests__/lead-test-utils";
import type { GrowthCampaign, PatientSegment, SegmentFieldDefinition } from "@/lib/entity/growth";

const capabilities = vi.hoisted(() => ({ modules: ["LEAD_CRM"] as string[] }));
vi.mock("@/lib/services/billing/billing.service", () => ({
  isBillingMockEnabled: false,
  billingService: {
    getCapabilities: vi.fn(async () => ({
      specialty: null,
      plan: null,
      operationalStatus: null,
      modules: [...capabilities.modules],
    })),
  },
}));

const segmentsApi = vi.hoisted(() => ({
  getPatientSegments: vi.fn(),
  getPatientSegmentById: vi.fn(),
  getSegmentFields: vi.fn(),
  createPatientSegment: vi.fn(),
  updatePatientSegment: vi.fn(),
  deletePatientSegment: vi.fn(),
  evaluatePatientSegment: vi.fn(),
}));
vi.mock("@/lib/services/growth/growth-segments.service", () => segmentsApi);

const campaignsApi = vi.hoisted(() => ({
  getGrowthCampaigns: vi.fn(),
  getGrowthCampaignById: vi.fn(),
  getGrowthCampaignMessages: vi.fn(),
  sendGrowthCampaignNow: vi.fn(),
  scheduleGrowthCampaign: vi.fn(),
  pauseGrowthCampaign: vi.fn(),
  resumeGrowthCampaign: vi.fn(),
  cancelGrowthCampaign: vi.fn(),
}));
vi.mock("@/lib/services/growth/growth-campaigns.service", () => campaignsApi);

const analyticsApi = vi.hoisted(() => ({
  getGrowthAnalyticsSummary: vi.fn(),
  getGrowthCampaignDetailAnalytics: vi.fn(),
  getGrowthCampaignConversions: vi.fn(),
}));
vi.mock("@/lib/services/growth/growth-analytics.service", () => analyticsApi);

vi.mock("@/lib/services/doctors", () => ({
  doctorsService: { getDoctors: vi.fn(async () => ({ entities: [{ id: "user-1", name: "Ana Recepción" }] })) },
}));
vi.mock("@/lib/services/services", () => ({
  servicesService: {
    getServices: vi.fn(async () => ({ entities: [{ id: "service-1", code: "IMP", name: "Implante dental" }] })),
  },
}));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/contexts/i18n-context", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "es" }),
}));
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => permissions.isAdmin, ...permissions }),
}));

import { useGrowthSegmentForm } from "@/lib/hooks/growth";
import { GrowthApiError } from "@/lib/services/growth/growth-errors";
import { notify } from "@/lib/utils/notify";
import { GrowthCampaignDetail } from "../campaigns/GrowthCampaignDetail";
import { GrowthSegmentForm } from "../segments/GrowthSegmentForm";
import { GrowthSegmentList } from "../segments/GrowthSegmentList";
import { SegmentPreview } from "../shared/SegmentPreview";

const LEAD_FIELDS: SegmentFieldDefinition[] = [
  { field: "stage", valueType: "STRING", operators: ["EQ", "IN"], allowedValues: ["NEW", "CONTACTED", "QUALIFIED"] },
  { field: "temperature", valueType: "STRING", operators: ["EQ", "IN", "IS_NULL"], allowedValues: ["COLD", "WARM", "HOT"] },
  { field: "daysSinceCreation", valueType: "INTEGER", operators: ["EQ", "GT", "GTE", "LT", "LTE"], allowedValues: [] },
  { field: "hasOverdueFollowUp", valueType: "BOOLEAN", operators: ["EQ"], allowedValues: [] },
];
const PATIENT_FIELDS: SegmentFieldDefinition[] = [
  { field: "lastVisitDaysAgo", valueType: "INTEGER", operators: ["EQ", "GT", "GTE", "LT", "LTE"], allowedValues: [] },
  { field: "birthdayMonth", valueType: "INTEGER", operators: ["EQ", "IN"], allowedValues: [] },
];

function makeSegment(overrides: Partial<PatientSegment> = {}): PatientSegment {
  return {
    id: "segment-1",
    name: "Sin visita hace 6 meses",
    segmentType: "CUSTOM",
    filterDefinition: JSON.stringify({
      logic: "AND",
      conditions: [{ field: "lastVisitDaysAgo", operator: "GT", value: 180 }],
    }),
    active: true,
    audience: "PATIENT",
    ...overrides,
  };
}

const LEAD_SEGMENT = makeSegment({
  id: "segment-2",
  name: "Prospectos calientes",
  audience: "LEAD",
  filterDefinition: JSON.stringify({
    logic: "AND",
    conditions: [{ field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] }],
  }),
});

function makeCampaign(overrides: Partial<GrowthCampaign> = {}): GrowthCampaign {
  return {
    id: "campaign-1",
    name: "Bienvenida a prospectos",
    campaignType: "PROMOTION",
    growthStatus: "COMPLETED",
    segmentName: "Prospectos calientes",
    templateName: "bienvenida",
    totalSent: 2,
    totalDelivered: 2,
    totalRead: 1,
    totalReplied: 1,
    totalFailed: 0,
    active: true,
    createdAt: "2026-10-01T15:00:00Z",
    audience: "LEAD",
    convertedLeads: 4,
    ...overrides,
  };
}

describe("campañas a prospectos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilities.modules = ["LEAD_CRM"];
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
    segmentsApi.getSegmentFields.mockImplementation(async (audience: string) => ({
      audience,
      fields: audience === "LEAD" ? LEAD_FIELDS : PATIENT_FIELDS,
    }));
    segmentsApi.getPatientSegments.mockResolvedValue({
      entities: [makeSegment(), LEAD_SEGMENT],
      pagination: { page: 0, pageSize: 20, total: 2 },
    });
    analyticsApi.getGrowthCampaignDetailAnalytics.mockResolvedValue({
      sent: 2, delivered: 2, read: 1, replied: 1, appointmentsCreated: 0, appointmentsCompleted: 0, attributedValue: 0,
    });
    analyticsApi.getGrowthCampaignConversions.mockResolvedValue({
      entities: [],
      pagination: { page: 0, pageSize: 20, total: 0 },
    });
  });

  describe("sin LEAD_CRM nada cambia", () => {
    beforeEach(() => {
      capabilities.modules = ["FINANCE"];
      segmentsApi.getPatientSegments.mockResolvedValue({
        entities: [makeSegment()],
        pagination: { page: 0, pageSize: 20, total: 1 },
      });
    });

    it("crear segmento no ofrece la audiencia y usa el catálogo de pacientes", async () => {
      renderWithQuery(<GrowthSegmentForm />);
      await waitFor(() => expect(segmentsApi.getSegmentFields).toHaveBeenCalledWith("PATIENT"));
      expect(screen.queryByRole("radiogroup", { name: "Audiencia del segmento" })).not.toBeInTheDocument();
      expect(screen.queryByText("Prospectos")).not.toBeInTheDocument();
      expect(segmentsApi.getSegmentFields).not.toHaveBeenCalledWith("LEAD");
    });

    it("la lista no muestra etiqueta ni filtro de audiencia", async () => {
      renderWithQuery(<GrowthSegmentList />);
      expect(await screen.findByText("Sin visita hace 6 meses")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Filtrar por audiencia" })).not.toBeInTheDocument();
      expect(screen.queryByText("Pacientes")).not.toBeInTheDocument();
    });
  });

  describe("segmentos", () => {
    it("la lista etiqueta cada audiencia y filtra por ella", async () => {
      const user = userEvent.setup();
      renderWithQuery(<GrowthSegmentList />);
      expect(await screen.findByText("Prospectos calientes")).toBeInTheDocument();
      expect(screen.getByText("Etapa está en Nuevo, Contactado")).toBeInTheDocument();

      const filter = await screen.findByRole("group", { name: "Filtrar por audiencia" });
      await user.click(filter.querySelector('button:nth-child(3)') as HTMLElement);
      expect(screen.queryByText("Sin visita hace 6 meses")).not.toBeInTheDocument();
      expect(screen.getByText("Prospectos calientes")).toBeInTheDocument();
    });

    it("al crear, cambiar la audiencia recarga el catálogo y vacía las condiciones", async () => {
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.canChooseAudience).toBe(true));
      await waitFor(() => expect(result.current.fields).toEqual(PATIENT_FIELDS));

      act(() => {
        result.current.form.setValue("conditions", [{ field: "lastVisitDaysAgo", operator: "GT", value: 90 }]);
      });
      act(() => result.current.changeAudience("LEAD"));

      await waitFor(() => expect(result.current.fields).toEqual(LEAD_FIELDS));
      expect(segmentsApi.getSegmentFields).toHaveBeenCalledWith("LEAD");
      expect(result.current.form.getValues("conditions")).toEqual([{ field: "", operator: "", value: "" }]);
    });

    it("crea un segmento de prospectos con valores tipados, IN e IS_NULL", async () => {
      segmentsApi.createPatientSegment.mockResolvedValue("segment-9");
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.canChooseAudience).toBe(true));
      act(() => result.current.changeAudience("LEAD"));
      await waitFor(() => expect(result.current.fields).toEqual(LEAD_FIELDS));

      await act(async () => {
        await result.current.handleSubmit({
          audience: "LEAD",
          name: "Prospectos por recuperar",
          description: undefined,
          conditions: [
            { field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] },
            { field: "temperature", operator: "IS_NULL", value: "" },
            { field: "daysSinceCreation", operator: "GTE", value: "7" },
            { field: "hasOverdueFollowUp", operator: "EQ", value: true },
          ],
        });
      });

      const payload = segmentsApi.createPatientSegment.mock.calls[0][0];
      expect(payload.audience).toBe("LEAD");
      expect(payload).not.toHaveProperty("clinicId");
      expect(JSON.parse(payload.filterDefinition)).toEqual({
        logic: "AND",
        conditions: [
          { field: "stage", operator: "IN", value: ["NEW", "CONTACTED"] },
          { field: "temperature", operator: "IS_NULL" },
          { field: "daysSinceCreation", operator: "GTE", value: 7 },
          { field: "hasOverdueFollowUp", operator: "EQ", value: true },
        ],
      });
    });

    it("no envía una condición inválida: marca el valor", async () => {
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.fields).toEqual(PATIENT_FIELDS));

      await act(async () => {
        await result.current.handleSubmit({
          audience: "PATIENT",
          name: "Cumpleañeros",
          description: undefined,
          conditions: [{ field: "birthdayMonth", operator: "IN", value: [] }],
        });
      });

      expect(segmentsApi.createPatientSegment).not.toHaveBeenCalled();
      expect(result.current.form.getFieldState("conditions.0.value").error?.message).toBe("Elige al menos un valor");
    });

    it("un segmento de pacientes se guarda como antes, con números tipados", async () => {
      segmentsApi.createPatientSegment.mockResolvedValue("segment-8");
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.fields).toEqual(PATIENT_FIELDS));

      await act(async () => {
        await result.current.handleSubmit({
          audience: "PATIENT",
          name: "Cumpleañeros",
          description: undefined,
          conditions: [{ field: "birthdayMonth", operator: "IN", value: ["7", "8"] }],
        });
      });

      const payload = segmentsApi.createPatientSegment.mock.calls[0][0];
      expect(payload.audience).toBe("PATIENT");
      expect(JSON.parse(payload.filterDefinition).conditions).toEqual([
        { field: "birthdayMonth", operator: "IN", value: [7, 8] },
      ]);
    });

    it("al editar, la audiencia es de solo lectura y no se envía", async () => {
      segmentsApi.getPatientSegmentById.mockResolvedValue(LEAD_SEGMENT);
      segmentsApi.updatePatientSegment.mockResolvedValue(undefined);
      renderWithQuery(<GrowthSegmentForm segmentId="segment-2" />);

      expect(await screen.findByText("La audiencia se elige al crear el segmento y no se puede cambiar.")).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup", { name: "Audiencia del segmento" })).not.toBeInTheDocument();
      await waitFor(() => expect(segmentsApi.getSegmentFields).toHaveBeenCalledWith("LEAD"));

      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({ segmentId: "segment-2" }));
      await waitFor(() => expect(result.current.audience).toBe("LEAD"));
      await waitFor(() => expect(result.current.fields).toEqual(LEAD_FIELDS));
      expect(result.current.canChooseAudience).toBe(false);
      act(() => result.current.changeAudience("PATIENT"));
      expect(result.current.audience).toBe("LEAD");

      await act(async () => {
        await result.current.handleSubmit(result.current.form.getValues());
      });
      expect(segmentsApi.updatePatientSegment.mock.calls[0][1]).not.toHaveProperty("audience");
    });

    it("un campo de la otra audiencia muestra el mensaje del backend junto a las condiciones", async () => {
      const message = "El campo lastVisitDaysAgo pertenece a la audiencia de pacientes.";
      segmentsApi.createPatientSegment.mockRejectedValue(
        new GrowthApiError(message, 400, "BAD_REQUEST", "SEGMENT_FIELD_NOT_ALLOWED"),
      );
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.canChooseAudience).toBe(true));
      act(() => result.current.changeAudience("LEAD"));
      await waitFor(() => expect(result.current.fields).toEqual(LEAD_FIELDS));

      await act(async () => {
        await result.current.handleSubmit({
          audience: "LEAD",
          name: "Prospectos nuevos",
          description: undefined,
          conditions: [{ field: "stage", operator: "EQ", value: "NEW" }],
        });
      });

      expect(result.current.conditionsError).toBe(message);
      expect(notify.error).toHaveBeenCalledWith(message);
      expect(push).not.toHaveBeenCalled();
    });

    it("con el módulo apagado a mitad de sesión no repite el aviso", async () => {
      segmentsApi.createPatientSegment.mockRejectedValue(
        new GrowthApiError("Tu clínica no tiene habilitado este módulo", 403, "FORBIDDEN", "MODULE_NOT_ENABLED"),
      );
      const { result } = renderHookWithQuery(() => useGrowthSegmentForm({}));
      await waitFor(() => expect(result.current.canChooseAudience).toBe(true));
      act(() => result.current.changeAudience("LEAD"));
      await waitFor(() => expect(result.current.fields).toEqual(LEAD_FIELDS));

      await act(async () => {
        await result.current.handleSubmit({
          audience: "LEAD",
          name: "Prospectos nuevos",
          description: undefined,
          conditions: [{ field: "stage", operator: "EQ", value: "NEW" }],
        });
      });

      expect(notify.error).not.toHaveBeenCalled();
      expect(result.current.conditionsError).toBeNull();
    });
  });

  describe("vista previa del segmento", () => {
    it("muestra el teléfono del prospecto sin nombre y avisa de los que no lo tienen", () => {
      renderWithQuery(
        <SegmentPreview
          evaluation={{
            audience: "LEAD",
            count: 12,
            preview: [
              { patientId: null, leadId: "lead-1", name: null, phone: "+50584001000", lastVisitDate: null },
              { patientId: null, leadId: "lead-2", name: "Carla Prueba", phone: "+50584001001", lastVisitDate: null },
            ],
            excludedWithoutName: 3,
            recipientsHidden: false,
          }}
        />,
      );
      expect(screen.getByText("12 prospectos")).toBeInTheDocument();
      expect(screen.getByText("+50584001000")).toBeInTheDocument();
      expect(screen.getByText("Sin nombre")).toBeInTheDocument();
      expect(screen.getByText("Carla Prueba")).toBeInTheDocument();
      expect(
        screen.getByText("3 prospectos no tienen nombre; no recibirán una plantilla que salude por nombre."),
      ).toBeInTheDocument();
      expect(screen.getByText(/abiertos, con consentimiento de marketing y teléfono verificado/)).toBeInTheDocument();
    });

    it("con destinatarios ocultos muestra el conteo y por qué no hay nombres", () => {
      renderWithQuery(
        <SegmentPreview
          evaluation={{ audience: "LEAD", count: 12, preview: [], excludedWithoutName: 0, recipientsHidden: true }}
        />,
      );
      expect(screen.getByText("12 prospectos")).toBeInTheDocument();
      expect(screen.getByText("No tienes permiso para ver quiénes son los prospectos")).toBeInTheDocument();
    });

    it("un segmento de pacientes muestra pacientes, sin avisos de prospectos", () => {
      renderWithQuery(
        <SegmentPreview
          evaluation={{
            count: 1,
            preview: [{ patientId: "patient-1", name: "Mario Prueba", phone: "+50584002000", lastVisitDate: "2026-04-01" }],
          }}
        />,
      );
      expect(screen.getByText("1 paciente")).toBeInTheDocument();
      expect(screen.getByText("Mario Prueba")).toBeInTheDocument();
      expect(screen.queryByText(/consentimiento de marketing/)).not.toBeInTheDocument();
    });
  });

  describe("detalle de una campaña a prospectos", () => {
    it("muestra audiencia, prospectos convertidos y el motivo de cada omisión", async () => {
      campaignsApi.getGrowthCampaignById.mockResolvedValue(makeCampaign());
      campaignsApi.getGrowthCampaignMessages.mockResolvedValue({
        entities: [
          { id: "m1", campaignId: "campaign-1", patientId: null, leadId: "lead-1", phone: "50584001000", deliveryStatus: "READ", readAt: "2026-10-02T15:00:00Z" },
          { id: "m2", campaignId: "campaign-1", patientId: null, leadId: "lead-2", phone: "50584001001", deliveryStatus: "SKIPPED", failureReason: "Prospecto sin consentimiento de marketing" },
          { id: "m3", campaignId: "campaign-1", patientId: null, leadId: "lead-3", phone: "50584001002", deliveryStatus: "SKIPPED", failureReason: "El prospecto ya es paciente" },
        ],
        pagination: { page: 0, pageSize: 20, total: 3 },
      });
      renderWithQuery(<GrowthCampaignDetail campaignId="campaign-1" />);

      expect(await screen.findByText("Bienvenida a prospectos")).toBeInTheDocument();
      expect(screen.getByText("Prospectos")).toBeInTheDocument();
      expect(await screen.findByText("Prospectos convertidos")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();

      expect(await screen.findByText("Prospecto sin consentimiento de marketing")).toBeInTheDocument();
      expect(screen.getByText("El prospecto ya es paciente")).toBeInTheDocument();
      expect(screen.getAllByText("Omitido")).toHaveLength(2);
      const links = screen.getAllByRole("link", { name: "Ver prospecto" });
      expect(links[0]).toHaveAttribute("href", "/leads/lead-1");
    });

    it("sin permiso sobre leads se ven los totales, no las personas", async () => {
      permissions.isAdmin = false;
      permissions.permissionsObj = { campaign: 7 };
      campaignsApi.getGrowthCampaignById.mockResolvedValue(makeCampaign());
      campaignsApi.getGrowthCampaignMessages.mockResolvedValue({
        entities: [],
        pagination: { page: 0, pageSize: 20, total: 37 },
      });
      analyticsApi.getGrowthCampaignConversions.mockResolvedValue({
        entities: [],
        pagination: { page: 0, pageSize: 20, total: 5 },
      });
      renderWithQuery(<GrowthCampaignDetail campaignId="campaign-1" />);

      expect(await screen.findByText("37 prospectos")).toBeInTheDocument();
      expect(await screen.findByText("conversiones atribuidas")).toBeInTheDocument();
      expect(screen.getAllByText("No tienes permiso para ver quiénes son los prospectos")).toHaveLength(2);
      expect(screen.queryByRole("link", { name: "Ver prospecto" })).not.toBeInTheDocument();
    });

    it("una campaña de pacientes se ve como antes: sin destinatarios ni convertidos", async () => {
      capabilities.modules = ["FINANCE"];
      campaignsApi.getGrowthCampaignById.mockResolvedValue(
        makeCampaign({ name: "Reactivación", audience: "PATIENT", convertedLeads: null }),
      );
      renderWithQuery(<GrowthCampaignDetail campaignId="campaign-1" />);

      expect(await screen.findByText("Reactivación")).toBeInTheDocument();
      await waitFor(() => expect(analyticsApi.getGrowthCampaignConversions).toHaveBeenCalled());
      expect(campaignsApi.getGrowthCampaignMessages).not.toHaveBeenCalled();
      expect(screen.queryByText("Destinatarios")).not.toBeInTheDocument();
      expect(screen.queryByText("Prospectos convertidos")).not.toBeInTheDocument();
      expect(screen.queryByText("Pacientes")).not.toBeInTheDocument();
    });
  });
});
