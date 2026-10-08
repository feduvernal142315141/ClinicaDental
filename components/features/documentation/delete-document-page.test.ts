import { describe, expect, it } from "vitest";
import type { DocumentBlock } from "@/lib/entity/documentation";
import { localDocumentLayout } from "./local-document-layout";
import { deleteDocumentPage } from "./delete-document-page";
const measure = (text: string, size: number) => Array.from(text).length * size / 2;
const layoutOf = (blocks: DocumentBlock[]) => localDocumentLayout({ name: "Plantilla", blocks }, measure);
describe("delete document page", () => {
  it("deletes page content and shifts the remaining explicit pages and free positions", () => {
    const blocks: DocumentBlock[] = [{ type: "TEXT", text: "Primera" }, { type: "PAGE_BREAK", page: 1 }, { type: "TEXT", text: "Segunda" }, { type: "LOGO", position: { page: 1, x: 24, y: 300 } }, { type: "PAGE_BREAK", page: 2 }, { type: "TEXT", text: "Tercera" }, { type: "SIGNATURE", position: { page: 2, x: 24, y: 400 } }];
    const result = deleteDocumentPage(blocks, layoutOf(blocks), 1);
    expect(result).toEqual([blocks[0], { type: "PAGE_BREAK", page: 1 }, blocks[5], { ...blocks[6], position: { page: 1, x: 24, y: 400 } }]);
    expect(layoutOf(result).pageCount).toBe(2);
    expect(blocks[6].position?.page).toBe(2);
  });
  it("deletes first, last and trailing blank pages", () => {
    const blocks: DocumentBlock[] = [{ type: "TEXT", text: "Primera" }, { type: "PAGE_BREAK", page: 1 }, { type: "TEXT", text: "Segunda" }, { type: "PAGE_BREAK", page: 2 }];
    const first = deleteDocumentPage(blocks, layoutOf(blocks), 0);
    expect(first).toEqual([blocks[2], { type: "PAGE_BREAK", page: 1 }]);
    const last = deleteDocumentPage(blocks, layoutOf(blocks), 2);
    expect(last).toEqual(blocks.slice(0, 3)); expect(layoutOf(last).pageCount).toBe(2);
  });
  it("removes only the selected part of a text block spanning automatic pages", () => {
    const blocks: DocumentBlock[] = [{ type: "TEXT", text: Array.from({ length: 130 }, (_, i) => `Línea ${i} á😀\n`).join("") }];
    const layout = layoutOf(blocks);
    expect(layout.pageCount).toBeGreaterThan(2);
    const result = deleteDocumentPage(blocks, layout, 1);
    const removed = layout.textRanges.filter(item => item.page === 1);
    const start = removed[0].start, end = removed[removed.length - 1].end;
    expect(result[0].text).toBe(blocks[0].text!.slice(0, start) + blocks[0].text!.slice(end));
    expect(result[0].text).toContain("Línea 0 á😀"); expect(result[0].text).toContain("Línea 129 á😀");
    expect(layoutOf(result).pageCount).toBe(layout.pageCount - 1);
  });
  it("retains one page and rejects invalid page numbers", () => {
    const blocks: DocumentBlock[] = [{ type: "TEXT", text: "Única" }];
    expect(deleteDocumentPage(blocks, layoutOf(blocks), 0)).toBe(blocks);
    expect(deleteDocumentPage(blocks, layoutOf(blocks), -1)).toBe(blocks);
  });
});
