import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentUpload } from "./document-upload";
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const file = new File(["fake"], "consentimiento.pdf", { type: "application/pdf" });
describe("document upload drop zone", () => {
  it("accepts dropped files and highlights the target", () => {
    const receive = vi.fn(); render(<DocumentUpload disabled={false} onFiles={receive} />);
    const target = screen.getByRole("button");
    fireEvent.dragOver(target, { dataTransfer: { types: ["Files"] } });
    expect(target.className).toContain("border-brand");
    fireEvent.drop(target, { dataTransfer: { files: [file] } });
    expect(receive).toHaveBeenCalledWith([file]);
    expect(target.className).not.toContain("bg-brand/10");
  });
  it("blocks drops while an import is busy", () => {
    const receive = vi.fn(); render(<DocumentUpload disabled onFiles={receive} />);
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file] } });
    expect(receive).not.toHaveBeenCalled();
  });
  it("retains picker support and passes multiple files for explicit validation", () => {
    const receive = vi.fn(); const { container } = render(<DocumentUpload disabled={false} onFiles={receive} />);
    const input = container.querySelector("input")!;
    fireEvent.change(input, { target: { files: [file] } });
    expect(receive).toHaveBeenCalledWith([file]);expect(input.value).toBe("");
    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [file, file] } });
    expect(receive).toHaveBeenLastCalledWith([file,file]);
  });
});
