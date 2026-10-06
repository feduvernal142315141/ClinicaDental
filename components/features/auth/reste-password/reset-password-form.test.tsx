import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetPasswordForm } from "./reset-password-form";

const router = vi.hoisted(() => ({ push: vi.fn() }));
const search = vi.hoisted(() => ({ params: new URLSearchParams("code=token-123&welcome=1") }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search.params,
}));

const resetPassword = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hooks/doctors/useDoctorAuth", () => ({
  useDoctorAuth: () => ({ resetPassword, loading: false }),
}));

// El cascarón visual (marca de la clínica, fondo animado) no es parte de esta prueba.
vi.mock("../components/auth-shell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const submitButton = () => screen.getByRole("button", { name: /Crear contraseña/ });

describe("Configura tu contraseña (/reset-password?welcome=1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.params = new URLSearchParams("code=token-123&welcome=1");
  });

  it('"Admin123!" ya no es "Excelente" y el botón queda deshabilitado', () => {
    render(<ResetPasswordForm />);
    type("Contraseña", "Admin123!");
    type("Confirmar contraseña", "Admin123!");

    expect(screen.queryByText("Excelente")).not.toBeInTheDocument();
    expect(screen.getByText("Entre 14 y 64 caracteres")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("cumple las cinco reglas pero no coincide la confirmación → deshabilitado", () => {
    render(<ResetPasswordForm />);
    type("Contraseña", "AdminClinica2026!");
    type("Confirmar contraseña", "AdminClinica2026?");
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("con las cinco reglas y ambas iguales envía la contraseña y va al login", async () => {
    resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    type("Contraseña", "AdminClinica2026!");
    type("Confirmar contraseña", "AdminClinica2026!");

    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ code: "token-123", password: "AdminClinica2026!" }),
    );
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("muestra tal cual el mensaje del backend ante un 400", async () => {
    resetPassword.mockRejectedValue(Object.assign(new Error("Contraseña no válida"), { status: 400 }));
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    type("Contraseña", "AdminClinica2026!");
    type("Confirmar contraseña", "AdminClinica2026!");
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Contraseña no válida");
    expect(screen.queryByRole("link", { name: /Olvidé mi contraseña/ })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("ante un 404 (enlace vencido o usado) ofrece pedir uno nuevo", async () => {
    resetPassword.mockRejectedValue(Object.assign(new Error("Usuario no encontrado"), { status: 404 }));
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    type("Contraseña", "AdminClinica2026!");
    type("Confirmar contraseña", "AdminClinica2026!");
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Usuario no encontrado");
    expect(screen.getByRole("link", { name: /Olvidé mi contraseña/ })).toHaveAttribute("href", "/forgot-password");
  });
});
