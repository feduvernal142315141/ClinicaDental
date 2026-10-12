import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/contexts/i18n-context";
import type { ClinicTemplate } from "@/lib/entity/settings";
import { WhatsAppTemplatesPanel } from "../WhatsAppTemplatesPanel";
import { TemplateRepublishResult } from "../TemplateRepublishDialogs";

const wrap = (children: ReactNode) => <I18nProvider>{children}</I18nProvider>;

// Solo datos ficticios.
const template = (id: string, overrides: Partial<ClinicTemplate> = {}): ClinicTemplate => ({
  id,
  name: `plantilla_${id}`,
  body: "Hola {{1}}",
  provider: "META",
  category: "UTILITY",
  metaTemplateStatus: "APPROVED",
  ...overrides,
});

function renderPanel(
  templates: ClinicTemplate[],
  props: Partial<React.ComponentProps<typeof WhatsAppTemplatesPanel>> = {},
) {
  const onSync = vi.fn();
  const onRepublish = vi.fn();
  render(
    wrap(
      <WhatsAppTemplatesPanel
        templates={templates}
        loading={false}
        onSync={onSync}
        isSyncing={false}
        onRepublish={onRepublish}
        onCreate={vi.fn()}
        savingTemplate={false}
        {...props}
      />,
    ),
  );
  return { onSync, onRepublish };
}

beforeEach(() => window.localStorage.clear());

describe("Plantillas: no disponibles en la cuenta actual", () => {
  it("muestra el estado con su explicación, distinto de Rechazada", () => {
    renderPanel([
      template("a", { metaTemplateStatus: "NOT_IN_ACCOUNT" }),
      template("b", { metaTemplateStatus: "REJECTED" }),
    ]);

    const row = screen.getByRole("button", { name: /plantilla_a/ });
    const badge = within(row).getByText("No disponible en esta cuenta");
    expect(badge).toHaveAttribute("title", expect.stringContaining("no existe en la cuenta actual de WhatsApp"));

    const rejected = within(screen.getByRole("button", { name: /plantilla_b/ })).getByText("Rechazada");
    expect(badge.className).not.toBe(rejected.className);
    // Al tocarla (está seleccionada), la explicación se lee en el detalle.
    expect(screen.getByRole("note")).toHaveTextContent("no se puede usar en recordatorios ni campañas");
  });

  it("avisa cuántas hay y sugiere republicar", () => {
    renderPanel([
      template("a", { metaTemplateStatus: "NOT_IN_ACCOUNT" }),
      template("b", { metaTemplateStatus: "NOT_IN_ACCOUNT" }),
      template("c"),
    ]);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("2 plantillas no están disponibles en la cuenta actual de WhatsApp");
    expect(within(banner).getByRole("button", { name: "Republicar en la cuenta actual" })).toBeInTheDocument();
  });

  it("sin plantillas en ese estado no hay aviso", () => {
    renderPanel([template("a"), template("b", { metaTemplateStatus: "PENDING" })]);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("se pueden filtrar", async () => {
    const user = userEvent.setup();
    renderPanel([template("a", { metaTemplateStatus: "NOT_IN_ACCOUNT" }), template("b")]);

    await user.click(screen.getByRole("button", { name: /^No disponibles/ }));

    expect(screen.getByRole("button", { name: /plantilla_a/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /plantilla_b/ })).not.toBeInTheDocument();
  });
});

describe("Plantillas: republicar en la cuenta actual", () => {
  it("pide confirmación explicando qué pasa, y solo entonces republica", async () => {
    const user = userEvent.setup();
    const { onRepublish, onSync } = renderPanel([template("a")]);

    await user.click(screen.getByRole("button", { name: "Republicar en la cuenta actual" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("se enviarán de nuevo a revisión de Meta");
    expect(dialog).toHaveTextContent("Quedarán en «Pendiente» y no se podrán usar en recordatorios ni campañas hasta que Meta las apruebe");
    expect(dialog).toHaveTextContent("La aprobación no es inmediata y Meta puede rechazar alguna");
    expect(onRepublish).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Republicar" }));

    expect(onRepublish).toHaveBeenCalledTimes(1);
    // Republicar no es sincronizar.
    expect(onSync).not.toHaveBeenCalled();
  });

  it("cancelar no republica", async () => {
    const user = userEvent.setup();
    const { onRepublish } = renderPanel([template("a")]);

    await user.click(screen.getByRole("button", { name: "Republicar en la cuenta actual" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    expect(onRepublish).not.toHaveBeenCalled();
  });

  it("quien no puede sincronizar no ve sincronizar ni republicar, pero sí el aviso", () => {
    renderPanel([template("a", { metaTemplateStatus: "NOT_IN_ACCOUNT" })], { canSync: false });

    expect(screen.queryByRole("button", { name: "Sincronizar con Meta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Republicar en la cuenta actual" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Pide a un administrador que las republique");
  });

  it("mientras republica no deja lanzar otra ni sincronizar", () => {
    renderPanel([template("a")], { isRepublishing: true });

    expect(screen.getByRole("button", { name: "Republicar en la cuenta actual" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sincronizar con Meta" })).toBeDisabled();
  });
});

describe("Resultado de republicar", () => {
  it("resume los cuatro grupos y dice qué hacer con cada omitida o fallida, sin códigos crudos", () => {
    render(
      wrap(
        <TemplateRepublishResult
          onClose={vi.fn()}
          result={{
            republished: 3,
            alreadyInAccount: 1,
            skipped: [
              { id: "s1", name: "promo_importada", reason: "CREATED_OUTSIDE_PANEL" },
              { id: "s2", name: "vacia", reason: "EMPTY_BODY" },
            ],
            failed: [
              { id: "f1", name: "recordatorio_24h", reason: "META_REJECTED" },
              { id: "f2", name: "rara", reason: "ALGO_NUEVO" },
            ],
          }}
        />,
      ),
    );
    const dialog = screen.getByRole("dialog");
    const group = (label: string) => within(dialog).getByText(label).parentElement as HTMLElement;

    expect(group("Republicadas (en revisión)")).toHaveTextContent("3");
    expect(group("Ya estaban en la cuenta")).toHaveTextContent("1");
    expect(group("Omitidas")).toHaveTextContent("2");
    expect(group("Fallidas")).toHaveTextContent("2");

    const item = (name: string) => within(dialog).getByText(name).closest("li") as HTMLElement;
    expect(item("promo_importada")).toHaveTextContent("Créala en el panel de Meta y luego pulsa «Sincronizar con Meta»");
    expect(item("vacia")).toHaveTextContent("No tiene texto guardado");
    expect(item("recordatorio_24h")).toHaveTextContent("Meta no la aceptó");
    expect(item("rara")).toHaveTextContent("No se pudo republicar");

    expect(dialog).not.toHaveTextContent(/CREATED_OUTSIDE_PANEL|EMPTY_BODY|META_REJECTED|ALGO_NUEVO/);
    expect(dialog).toHaveTextContent("quedan en «Pendiente» hasta que Meta las apruebe");
  });

  it("si no se envió nada nuevo, no promete una revisión de Meta", () => {
    render(
      wrap(
        <TemplateRepublishResult
          onClose={vi.fn()}
          result={{ republished: 0, alreadyInAccount: 2, skipped: [], failed: [] }}
        />,
      ),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("No se envió ninguna plantilla nueva a Meta.");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("hasta que Meta las apruebe");
  });
});
