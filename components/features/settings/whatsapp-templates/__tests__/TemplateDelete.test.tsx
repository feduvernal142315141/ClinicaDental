import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { I18nProvider } from "@/lib/contexts/i18n-context";
import { TEMPLATE_DELETE_MAX, type ClinicTemplate } from "@/lib/entity/settings";
import { WhatsAppTemplatesPanel } from "../WhatsAppTemplatesPanel";
import { TemplateDeleteResult } from "../TemplateDeleteDialogs";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});
beforeEach(() => window.localStorage.clear());

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

/**
 * La pantalla con su lista viva: `onDelete` quita de la lista lo que el servidor
 * dice haber eliminado, como hace la recarga real.
 */
function Screen({
  initial,
  onDelete,
  canDelete = true,
}: {
  initial: ClinicTemplate[];
  onDelete: (ids: string[]) => Promise<string[]>;
  canDelete?: boolean;
}) {
  const [templates, setTemplates] = React.useState(initial);
  return (
    <I18nProvider>
      <WhatsAppTemplatesPanel
        templates={templates}
        loading={false}
        onSync={vi.fn()}
        isSyncing={false}
        onCreate={vi.fn()}
        savingTemplate={false}
        onDelete={
          canDelete
            ? async (ids) => {
                const deleted = await onDelete(ids);
                setTemplates((prev) => prev.filter((t) => !deleted.includes(t.id)));
                return deleted;
              }
            : undefined
        }
      />
    </I18nProvider>
  );
}

const row = (id: string) => screen.queryByRole("button", { name: new RegExp(`^plantilla_${id}\\b`) });
const box = (id: string) => screen.getByRole("checkbox", { name: `Seleccionar la plantilla plantilla_${id}` });

describe("Eliminar plantillas", () => {
  it("no ofrece eliminar a quien no tiene el permiso", () => {
    render(<Screen initial={[template("a")]} onDelete={vi.fn()} canDelete={false} />);

    expect(screen.queryByRole("button", { name: "Seleccionar plantillas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Opciones de la plantilla/ })).not.toBeInTheDocument();
  });

  it("elimina una desde el menú de su fila, tras confirmar con las consecuencias", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async (ids: string[]) => ids);
    render(<Screen initial={[template("a"), template("b")]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Opciones de la plantilla plantilla_b" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Se eliminará la plantilla «plantilla_b».");
    expect(dialog).toHaveTextContent("no se puede deshacer desde la aplicación");
    expect(dialog).toHaveTextContent("también se eliminan en Meta, en todos sus idiomas");
    expect(dialog).toHaveTextContent("«No disponible en esta cuenta» solo se quitan de la lista");
    expect(dialog).toHaveTextContent("en uso por un recordatorio o una campaña no se eliminan");
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Eliminar plantilla" }));

    expect(onDelete).toHaveBeenCalledWith(["b"]);
    await waitFor(() => expect(row("b")).not.toBeInTheDocument());
    expect(row("a")).toBeInTheDocument();
  });

  it("cancelar no elimina nada", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async (ids: string[]) => ids);
    render(<Screen initial={[template("a")]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Opciones de la plantilla plantilla_a" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(row("a")).toBeInTheDocument();
  });

  it("elimina varias seleccionadas y sale del modo selección cuando todo salió", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async (ids: string[]) => ids);
    render(<Screen initial={[template("a"), template("b"), template("c")]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));
    expect(screen.getByText("0 seleccionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();

    await user.click(box("a"));
    // Pulsar la fila también la marca, en vez de abrir el detalle.
    await user.click(row("c")!);
    expect(screen.getByText("2 seleccionadas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Se eliminarán 2 plantillas.");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar 2 plantillas" }));

    expect(onDelete).toHaveBeenCalledWith(["a", "c"]);
    await waitFor(() => expect(row("a")).not.toBeInTheDocument());
    expect(row("b")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Seleccionar plantillas" })).toBeInTheDocument());
  });

  it("conserva seleccionadas las bloqueadas o fallidas para reintentar", async () => {
    const user = userEvent.setup();
    // El servidor solo elimina "a": "b" está en uso.
    const onDelete = vi.fn(async () => ["a"]);
    render(<Screen initial={[template("a"), template("b")]} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));
    await user.click(box("a"));
    await user.click(box("b"));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar 2 plantillas" }),
    );

    await waitFor(() => expect(row("a")).not.toBeInTheDocument());
    expect(screen.getByText("1 seleccionadas")).toBeInTheDocument();
    expect(box("b")).toBeChecked();
  });

  it("«Seleccionar no utilizables» marca rechazadas y no disponibles, sin eliminar nada", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async (ids: string[]) => ids);
    render(
      <Screen
        initial={[
          template("a"),
          template("b", { metaTemplateStatus: "REJECTED" }),
          template("c", { metaTemplateStatus: "NOT_IN_ACCOUNT" }),
          template("d", { metaTemplateStatus: "PENDING" }),
        ]}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar no utilizables (2)" }));

    expect(screen.getByText("2 seleccionadas")).toBeInTheDocument();
    expect(box("b")).toBeChecked();
    expect(box("c")).toBeChecked();
    expect(box("a")).not.toBeChecked();
    expect(box("d")).not.toBeChecked();
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("limita la selección a 100 y lo dice", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: TEMPLATE_DELETE_MAX + 1 }, (_, i) =>
      template(String(i), { metaTemplateStatus: "REJECTED" }),
    );
    render(<Screen initial={many} onDelete={vi.fn(async (ids: string[]) => ids)} />);

    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar no utilizables (101)" }));

    expect(screen.getByText("100 seleccionadas")).toBeInTheDocument();
    expect(screen.getByText("Puedes seleccionar hasta 100 plantillas a la vez.")).toBeInTheDocument();
    expect(box("100")).toBeDisabled();
    expect(box("0")).not.toBeDisabled();
  });

  it("cancelar la selección no deja nada marcado", async () => {
    const user = userEvent.setup();
    render(<Screen initial={[template("a")]} onDelete={vi.fn(async (ids: string[]) => ids)} />);

    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));
    await user.click(box("a"));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar plantillas" }));

    expect(screen.getByText("0 seleccionadas")).toBeInTheDocument();
  });
});

describe("Resultado de eliminar", () => {
  it("resume lo eliminado y dice qué hacer con cada bloqueada o fallida, sin códigos crudos", () => {
    render(
      <I18nProvider>
        <TemplateDeleteResult
          onClose={vi.fn()}
          result={{
            deleted: 2,
            deletedIds: ["x", "y"],
            blocked: [
              { id: "b1", name: "recordatorio_24h", reason: "IN_USE_BY_REMINDER" },
              { id: "b2", name: "promo_verano", reason: "IN_USE_BY_CAMPAIGN" },
            ],
            failed: [
              { id: "f1", name: "aviso", reason: "META_DELETE_FAILED" },
              { id: "f2", name: "rara", reason: "ALGO_NUEVO" },
            ],
          }}
        />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog");
    const group = (label: string) => within(dialog).getByText(label).parentElement as HTMLElement;
    const item = (name: string) => within(dialog).getByText(name).closest("li") as HTMLElement;

    expect(group("Eliminadas")).toHaveTextContent("2");
    expect(group("En uso")).toHaveTextContent("2");
    expect(group("Fallidas")).toHaveTextContent("2");

    expect(item("recordatorio_24h")).toHaveTextContent("Cambia la plantilla de ese recordatorio");
    expect(item("promo_verano")).toHaveTextContent("Cambia la plantilla de esa campaña o cancélala");
    expect(item("aviso")).toHaveTextContent("Meta no confirmó el borrado. Vuelve a intentarlo");
    expect(item("rara")).toHaveTextContent("No se pudo eliminar");
    expect(dialog).not.toHaveTextContent(/IN_USE_BY|META_DELETE_FAILED|ALGO_NUEVO/);
  });
});
