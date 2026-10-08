import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { billingMockInstance, renderWithQuery, resetBillingMock } from "./billing-test-utils";
import { ChargesPage } from "../charges/ChargesPage";

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
vi.mock("@/lib/services/services", () => ({
  servicesService: { getServices: vi.fn().mockResolvedValue({ entities: [], pagination: { total: 0 } }) },
}));

function seedCharges() {
  const mock = resetBillingMock();
  const a1 = mock.controls.addAppointmentCharge("demo-patient-billing-001", "Profilaxis", 1200);
  const a2 = mock.controls.addAppointmentCharge("demo-patient-billing-001", "Resina", 1800);
  const b1 = mock.controls.addAppointmentCharge("demo-patient-billing-002", "Consulta", 600);
  return { mock, a1, a2, b1 };
}

describe("ChargesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("agrupa los cargos pendientes por paciente con su origen", async () => {
    seedCharges();
    renderWithQuery(<ChargesPage />);
    const group = await screen.findByRole("region", { name: "Cargos de Ana Demo Pérez" });
    expect(within(group).getByText("Profilaxis")).toBeInTheDocument();
    expect(within(group).getByText("Resina")).toBeInTheDocument();
    expect(within(group).getAllByText(/^Cita del \d{2}\/\d{2}$/).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Cargos de Luis Ficticio Gómez" })).toBeInTheDocument();
  });

  it("'Cobrar' abre Nuevo recibo con los chargeIds del paciente (sin los desmarcados)", async () => {
    const { a1, a2 } = seedCharges();
    const user = userEvent.setup();
    renderWithQuery(<ChargesPage />);
    const group = await screen.findByRole("region", { name: "Cargos de Ana Demo Pérez" });

    await user.click(within(group).getByRole("checkbox", { name: "Incluir Resina al cobrar" }));
    await user.click(within(group).getByRole("button", { name: /Cobrar \(1\)/ }));

    const url = router.push.mock.calls[0][0] as string;
    expect(url).toContain("/billing/invoices/new?patientId=demo-patient-billing-001");
    expect(url).toContain(`chargeIds=${a1.id}`);
    expect(url).not.toContain(a2.id);
  });

  it("'Descartar' pide motivo y saca el cargo de pendientes", async () => {
    const { b1 } = seedCharges();
    const user = userEvent.setup();
    renderWithQuery(<ChargesPage />);
    const group = await screen.findByRole("region", { name: "Cargos de Luis Ficticio Gómez" });
    await user.click(within(group).getByRole("button", { name: "Descartar Consulta" }));

    const dialog = await screen.findByRole("dialog");
    const reason = within(dialog).getByLabelText("Motivo");
    fireEvent.change(reason, { target: { value: "no" } });
    fireEvent.blur(reason);
    expect(await within(dialog).findByText("El motivo debe tener al menos 5 caracteres.")).toBeInTheDocument();

    fireEvent.change(reason, { target: { value: "Cortesía de la clínica" } });
    await user.click(within(dialog).getByRole("button", { name: "Descartar" }));

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Cargos de Luis Ficticio Gómez" })).not.toBeInTheDocument(),
    );
    const charges = await billingMockInstance().service.getCharges({ patientId: b1.patientId });
    expect(charges.entities[0]).toMatchObject({ status: "DISMISSED", dismissReason: "Cortesía de la clínica" });
  });

  it("sin permisos de cobrar ni editar no muestra 'Cobrar' ni 'Descartar'", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { billing: 8 };
    seedCharges();
    renderWithQuery(<ChargesPage />);
    await screen.findByRole("region", { name: "Cargos de Ana Demo Pérez" });
    expect(screen.queryByRole("button", { name: /Cobrar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descartar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargo manual" })).not.toBeInTheDocument();
  });
});
