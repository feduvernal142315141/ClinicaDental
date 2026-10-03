import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { billingMockInstance, renderWithQuery, resetBillingMock } from "./billing-test-utils";
import { EstimateForm } from "../estimates/EstimateForm";

vi.mock("@/lib/services/billing/billing.service", async () => (await import("./billing-test-utils")).serviceModule());
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => false, ...permissions }),
}));

// Catálogos de otros módulos: sin red en los tests.
vi.mock("@/lib/services/services", () => ({
  servicesService: { getServices: vi.fn().mockResolvedValue({ entities: [], pagination: { total: 0 } }) },
}));
vi.mock("@/lib/services/odontogram", () => ({
  treatmentPlanService: { getTreatmentPlansByPatient: vi.fn().mockResolvedValue({ entities: [] }) },
  treatmentPlanItemService: { getPlanItems: vi.fn().mockResolvedValue({ items: [] }) },
}));

const PATIENT = "patient-a";

async function setup() {
  resetBillingMock();
  const user = userEvent.setup();
  renderWithQuery(<EstimateForm initialPatientId={PATIENT} initialPatientName="Ana Demo" />);
  await screen.findByRole("heading", { name: "Nuevo presupuesto" });
  // Espera a que la configuración (moneda base) reinicie el formulario.
  await waitFor(() => expect(screen.getByLabelText("Descripción de la línea 1")).toBeInTheDocument());
  return { user };
}

function fillLine(description: string, price: string) {
  fireEvent.change(screen.getByLabelText("Descripción de la línea 1"), { target: { value: description } });
  fireEvent.change(screen.getByLabelText("Precio de la línea 1"), { target: { value: price } });
}

describe("EstimateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("'Enviar' crea el presupuesto en SENT y navega a su detalle", async () => {
    const { user } = await setup();
    const create = vi.spyOn(billingMockInstance().service, "createEstimate");
    fillLine("Limpieza dental", "1200");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: PATIENT,
        status: "SENT",
        items: [expect.objectContaining({ description: "Limpieza dental", quantity: 1, unitPrice: 1200 })],
      }),
    );
    expect(router.push.mock.calls[0][0]).toMatch(/^\/billing\/estimates\//);
  });

  it("'Guardar como borrador' crea en DRAFT", async () => {
    const { user } = await setup();
    const create = vi.spyOn(billingMockInstance().service, "createEstimate");
    fillLine("Radiografía", "350");
    await user.click(screen.getByRole("button", { name: "Guardar como borrador" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT" })));
  });

  it("valida al salir del campo (onBlur) con el mensaje del backend", async () => {
    await setup();
    const description = screen.getByLabelText("Descripción de la línea 1");
    fireEvent.focus(description);
    fireEvent.blur(description);
    expect(await screen.findByText("La descripción es obligatoria.")).toBeInTheDocument();
  });

  it("calcula la vista previa con HALF_UP por línea", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Descripción de la línea 1"), { target: { value: "Resina" } });
    fireEvent.change(screen.getByLabelText("Cantidad de la línea 1"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Precio de la línea 1"), { target: { value: "33.335" } });
    // 3 × 33.335 = 100.005 → 100.01 (HALF_UP)
    await waitFor(() => expect(screen.getAllByText(/100[.,]01/).length).toBeGreaterThan(0));
  });

  it("sin permiso de descuentos oculta los campos de descuento", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { billing: 3 };
    await setup();
    expect(screen.queryByLabelText("Descuento de la línea 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Descuento global")).not.toBeInTheDocument();
  });

  it("muestra en el formulario el 403 de descuento máximo del backend", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { billing: 3, billing_adjust: 1 };
    const { user } = await setup();
    billingMockInstance().controls.setActor({ isAdmin: false });
    fillLine("Corona", "1000");
    fireEvent.change(screen.getByLabelText("Descuento de la línea 1"), { target: { value: "300" } });
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El descuento supera el máximo permitido (20%).");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("sin permiso de crear muestra 'No tienes permiso'", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { billing: 2 };
    resetBillingMock();
    renderWithQuery(<EstimateForm initialPatientId={PATIENT} />);
    expect(await screen.findByText("No tienes permiso para esta acción")).toBeInTheDocument();
  });
});
