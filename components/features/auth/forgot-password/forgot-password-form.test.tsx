import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "./forgot-password-form";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const forgotPassword = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hooks/doctors/useDoctorAuth", () => ({
  useDoctorAuth: () => ({ forgotPassword, loading: false }),
}));

const slug = vi.hoisted(() => ({ value: "diente-sable-360" as string | null }));
vi.mock("@/lib/auth/clinic-slug", () => ({ resolveClinicSlug: () => slug.value }));

vi.mock("../components/auth-shell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const submit = () => screen.getByRole("button", { name: /Enviar instrucciones/ });

describe("Recupera tu acceso (/forgot-password)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    slug.value = "diente-sable-360";
  });

  it("envía el email Y el clinicSlug del subdominio", async () => {
    forgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "  admin@clinica.test " } });
    await user.click(submit());

    await waitFor(() =>
      expect(forgotPassword).toHaveBeenCalledWith({ email: "admin@clinica.test", clinicSlug: "diente-sable-360" }),
    );
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("sin clínica identificable no llama al backend y explica qué hacer", async () => {
    slug.value = null;
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "admin@clinica.test" } });
    await user.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos identificar la clínica desde esta dirección. Entra por el enlace de tu clínica.",
    );
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del backend si responde con error", async () => {
    forgotPassword.mockRejectedValue(new Error("El slug de la clínica no puede estar vacío"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "admin@clinica.test" } });
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("El slug de la clínica no puede estar vacío");
    expect(router.push).not.toHaveBeenCalled();
  });
});
