import { describe, expect, it } from "vitest";
import { templateSchema, validImportFile } from "./documentation";
import type { DocumentBlock } from "@/lib/entity/documentation";

const text: DocumentBlock = { type: "TEXT", text: "Contenido legal" };
const signature: DocumentBlock = { type: "SIGNATURE", alignment: "LEFT", width: 260 };
const valid = (blocks: DocumentBlock[]) => templateSchema.safeParse({ name: "Consentimiento", blocks }).success;

describe("documentation template validation", () => {
  it("requires legal text and a signature space, allowing checkbox acceptance in the same space", () => {
    expect(valid([text, signature])).toBe(true);
    expect(valid([signature])).toBe(false);
    expect(valid([text])).toBe(false);
    expect(valid([{ type: "TEXT", text: "   " }, signature])).toBe(false);
  });
  it("bounds signature/logo counts and visual widths", () => {
    expect(valid([text, ...Array.from({ length: 5 }, () => signature)])).toBe(true);
    expect(valid([text, ...Array.from({ length: 6 }, () => signature)])).toBe(false);
    expect(valid([text, signature, ...Array.from({ length: 4 }, (): DocumentBlock => ({ type: "LOGO" }))])).toBe(false);
    expect(valid([text, { ...signature, width: 59 }])).toBe(false);
    expect(valid([text, { ...signature, width: 451 }])).toBe(false);
  });
  it("checks combined text length across blocks and maximum block count", () => {
    expect(valid([{ type: "TEXT", text: "a".repeat(60_000) }, { type: "TEXT", text: "b".repeat(40_001) }, signature])).toBe(false);
    expect(valid([text, signature, ...Array.from({ length: 99 }, () => text)])).toBe(false);
  });
  it("rejects empty or unsupported files and files larger than the upload limit", () => {
    expect(validImportFile(new File(["content"], "plantilla.DOCX"))).toBe(true);
    expect(validImportFile(new File([], "plantilla.pdf"))).toBe(false);
    expect(validImportFile(new File(["<script>"], "plantilla.html"))).toBe(false);
    expect(validImportFile({ name: "scan.png", size: 10 * 1024 * 1024 + 1 } as File)).toBe(false);
  });
});

describe("free placement validation", () => {
  it("preserves page and point coordinates when parsing a valid positioned signature", () => {
    const position = { page: 0, x: 50, y: 200 };
    const parsed = templateSchema.parse({ name: "Consentimiento", blocks: [text, { ...signature, position }] });
    expect(parsed.blocks[1].position).toEqual(position);
  });
  it("rejects coordinates outside margins, fractional page indices and text positioning", () => {
    expect(valid([text, { ...signature, position: { page: 0, x: 23, y: 24 } }])).toBe(false);
    expect(valid([text, { ...signature, position: { page: 0.5, x: 24, y: 24 } }])).toBe(false);
    expect(valid([text, { ...signature, position: { page: 100, x: 24, y: 24 } }])).toBe(false);
    expect(valid([{ ...text, position: { page: 0, x: 24, y: 24 } }, signature])).toBe(false);
    expect(valid([text, { ...signature, position: { page: 0, x: NaN, y: 24 } }])).toBe(false);
  });
  it("requires a free signature to fit its full width and 180-point height", () => {
    expect(valid([text, { ...signature, width: 160 }])).toBe(true);
    expect(valid([text, { ...signature, width: 160, position: { page: 0, x: 24, y: 24 } }])).toBe(false);
    expect(valid([text, { ...signature, width: 450, position: { page: 0, x: 200, y: 24 } }])).toBe(false);
    expect(valid([text, { ...signature, width: 200, position: { page: 0, x: 24, y: 700 } }])).toBe(false);
    expect(valid([text, { ...signature, width: 200, position: { page: 0, x: 24, y: 637.88 } }])).toBe(true);
  });
});

describe("page break validation", () => {
  it("accepts empty pages without losing the minimum text/signature requirements", () => {
    expect(valid([text, signature, { type: "PAGE_BREAK", page: 1 }])).toBe(true);
    expect(valid([text, signature, { type: "PAGE_BREAK" }])).toBe(true);
    expect(valid([{ type: "PAGE_BREAK", page: 1 }])).toBe(false);
  });
  it("rejects out-of-range destinations and visual/text attributes on a page break", () => {
    for (const page of [0, 100, 1.5, NaN]) expect(valid([text, signature, { type: "PAGE_BREAK", page }])).toBe(false);
    expect(valid([text, signature, { type: "PAGE_BREAK", page: 1, width: 120 }])).toBe(false);
    expect(valid([text, signature, { type: "PAGE_BREAK", page: 1, text: "Texto" }])).toBe(false);
    expect(valid([{ ...text, page: 1 }, signature])).toBe(false);
  });
});

it("distinguishes the two signer roles and preserves legacy patient signatures", () => {
  expect(valid([text, signature, { ...signature, signerRole: "SPECIALIST" }])).toBe(true);
  expect(valid([text, { ...signature, signerRole: "SPECIALIST" }])).toBe(false);
  expect(valid([text, signature, { type: "LOGO", signerRole: "SPECIALIST" }])).toBe(false);
});
