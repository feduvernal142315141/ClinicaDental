import { describe, expect, it } from "vitest";
import { intersects } from "./document-layout";
import { localDocumentLayout, PAGE_SIZE } from "./local-document-layout";
const measure = (text: string, size: number) => Array.from(text).length * size / 2;
describe("local PDF page flow", () => {
  it("uses PDF baselines, margins and spacing", () => {
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [{ type: "TEXT", text: "Una línea" }, { type: "SIGNATURE", width: 260 }] }, measure);
    expect(layout.lines[0]).toEqual({ page: 0, x: 48, y: PAGE_SIZE.height - 700, size: 11, text: "Una línea" });
    expect(layout.placements[1]).toMatchObject({ page: 0, x: 48, y: PAGE_SIZE.height - 676, width: 260, height: 180 });
  });
  it("wraps long words, preserves line breaks and Unicode and paginates", () => {
    const text = "á😀".repeat(150) + "\r\n" + "Consentimiento del paciente.\n".repeat(100);
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [{ type: "TEXT", text }] }, measure);
    expect(layout.pageCount).toBeGreaterThan(2);
    expect(layout.lines.filter(line => line.size === 11).map(line => line.text).join("")).toBe(text.replace(/\r?\n/g, ""));
    expect(layout.lines.filter(line => line.size === 11).every(line => measure(line.text, 11) <= 499)).toBe(true);
    expect(layout.placements.every(item => item.y >= 24 && item.y + item.height <= PAGE_SIZE.height - 24)).toBe(true);
  });
  it("preserves free positions and logo proportions without reserving a second flow slot", () => {
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [
      { type: "LOGO", width: 120, position: { page: 3, x: 200, y: 24 } },
      { type: "SIGNATURE", alignment: "RIGHT", width: 260 },
    ] }, measure, 2);
    expect(layout.pageCount).toBe(4);
    expect(layout.placements[0]).toMatchObject({ page: 3, x: 200, y: 24, width: 120, height: 60 });
    expect(layout.placements[1]).toMatchObject({ page: 0, x: 287, y: PAGE_SIZE.height - 700 });
  });
  it("moves heading and legal text clear of a logo regardless of block order, and restores them when it moves away", () => {
    const blocks = [{ type: "TEXT" as const, text: "Contenido legal." }, { type: "LOGO" as const, width: 120, position: { page: 0, x: 80, y: 24 } }];
    const moved = localDocumentLayout({ name: "Nueva plantilla", blocks }, measure);
    const logo = moved.placements.find(item => item.type === "LOGO")!;
    for (const line of moved.lines) expect(intersects({ x: line.x, y: line.y - line.size, width: line.size === 11 ? 499 : measure(line.text, line.size), height: line.size + 5 }, logo)).toBe(false);
    const restored = localDocumentLayout({ name: "Nueva plantilla", blocks: [blocks[0], { ...blocks[1], position: { page: 0, x: 430, y: 24 } }] }, measure);
    expect(restored.lines[0].y).toBe(moved.lines[0].y);
    expect(moved.lines.map(line => line.text)).toEqual(["Contenido legal."]);
  });
  it("splits a text area around free elements and carries overflow onto subsequent pages without losing text", () => {
    const text = "Texto legal.\n".repeat(90);
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [
      { type: "TEXT", text }, { type: "SIGNATURE", width: 260, position: { page: 0, x: 100, y: 200 } },
    ] }, measure);
    const signature = layout.placements.find(item => item.type === "SIGNATURE")!;
    const areas = layout.placements.filter(item => item.type === "TEXT");
    expect(areas.filter(item => item.page === 0)).toHaveLength(2);
    expect(areas.filter(item => item.page === 0).every(item => !intersects(item, signature))).toBe(true);
    expect(layout.pageCount).toBeGreaterThan(2);
    expect(layout.lines.filter(item => item.size === 11).map(item => item.text).join("")).toBe(text.replace(/\n/g, ""));
  });

  it("preserves trailing blank pages and starts following text on the new page", () => {
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [
      { type: "TEXT", text: "Página original" }, { type: "SIGNATURE" },
      { type: "PAGE_BREAK", page: 1 }, { type: "TEXT", text: "Segunda página" }, { type: "PAGE_BREAK", page: 2 },
    ] }, measure);
    expect(layout.pageCount).toBe(3);
    expect(layout.lines.find(line => line.text === "Segunda página")?.page).toBe(1);
    expect(layout.lines.filter(line => line.page === 2)).toHaveLength(0);
  });
  it("appends a page after distant positioned shapes without removing intervening blanks", () => {
    const layout = localDocumentLayout({ name: "Plantilla", blocks: [
      { type: "TEXT", text: "Texto" }, { type: "SIGNATURE", position: { page: 3, x: 24, y: 24 } },
      { type: "PAGE_BREAK", page: 4 }, { type: "TEXT", text: "Última página" },
    ] }, measure);
    expect(layout.pageCount).toBe(5);
    expect(layout.lines.find(line => line.text === "Última página")?.page).toBe(4);
  });

});

it("free shapes side by side near the bottom do not create empty flow pages", () => {
  const layout = localDocumentLayout({ name: "Documento", blocks: [{ type: "TEXT", text: "Texto legal.\n".repeat(27) }, { type: "SIGNATURE", width: 200, height: 120, position: { page: 0, x: 370, y: 620 } }, { type: "LOGO", width: 120, position: { page: 0, x: 48, y: 620 } }] }, measure);
  expect(layout.pageCount).toBe(1);
  expect(layout.placements.filter(item => item.type !== "TEXT").map(item => item.page)).toEqual([0, 0]);
});
