import { placementAfterResize } from "./document-layout";
import { describe, expect, it } from "vitest";
import { clampPlacement, freePlacementSize, placementAfterDrag, positionWithoutOverlap, intersects } from "./document-layout";
import type { DocumentPlacement } from "@/lib/entity/documentation";
const page = { width: 595.2756, height: 841.8898 };
const placement: DocumentPlacement = { blockIndex: 1, type: "SIGNATURE", page: 0, x: 100, y: 100, width: 160, height: 140 };

describe("PDF position geometry", () => {
  it("converts screen deltas into PDF points at desktop and mobile scale", () => {
    const size = { width: 200, height: 180 };
    const result = placementAfterDrag({ page: 0, x: 100, y: 100 }, { x: 50, y: 25 }, { width: page.width / 2, height: page.height / 2 }, size, page);
    expect(result).toEqual({ page: 0, x: 200, y: 150 });
  });
  it("keeps the entire element inside the 24-point page margins", () => {
    const result = clampPlacement({ page: 2, x: 5000, y: 5000 }, { width: 450, height: 180 }, page);
    expect(result.page).toBe(2);
    expect(result.x + 450).toBeLessThanOrEqual(page.width - 24);
    expect(result.y + 180).toBeLessThanOrEqual(page.height - 24);
    expect(clampPlacement({ page: 0, x: -1, y: -999 }, { width: 200, height: 180 }, page)).toEqual({ page: 0, x: 24, y: 24 });
  });
  it("expands legacy signatures for free placement without mutating the block or authoritative logo ratio", () => {
    const block = { type: "SIGNATURE" as const, width: 160 };
    expect(freePlacementSize(block, placement)).toEqual({ width: 200, height: 180 });
    expect(block.width).toBe(160);
    expect(freePlacementSize({ type: "LOGO", width: 400 }, { ...placement, type: "LOGO", width: 80, height: 160 })).toEqual({ width: 80, height: 160 });
  });
  it("places a dragged element beside a colliding shape and stays inside the page", () => {
    const obstacle: DocumentPlacement = { blockIndex: 2, type: "LOGO", page: 0, x: 100, y: 100, width: 120, height: 120 };
    const result = positionWithoutOverlap({ page: 0, x: 150, y: 100 }, { width: 200, height: 180 }, page, [obstacle])!;
    expect(result).toEqual({ page: 0, x: 228, y: 100 });
    expect(intersects({ ...result, width: 200, height: 180 }, obstacle)).toBe(false);
  });
  it("leaves other pages and text to the reflow calculation", () => {
    expect(positionWithoutOverlap({ page: 1, x: 100, y: 100 }, { width: 200, height: 180 }, page, [placement, { ...placement, type: "TEXT", page: 1 }])).toEqual({ page: 1, x: 100, y: 100 });
  });

});

it("resizes signatures at any zoom while anchoring the opposite corner", () => {
  const page = { width: 595.2756, height: 841.8898 };
  const origin = { blockIndex: 0, type: "SIGNATURE" as const, page: 0, x: 100, y: 100, width: 260, height: 180 };
  const full = placementAfterResize(origin, "se", { x: 40, y: 60 }, page, page);
  const half = placementAfterResize(origin, "se", { x: 20, y: 30 }, { width: page.width / 2, height: page.height / 2 }, page);
  expect(full).toEqual({ page: 0, x: 100, y: 100, width: 300, height: 240 });
  expect(half).toEqual(full);
  expect(placementAfterResize(origin, "nw", { x: -30, y: -40 }, page, page)).toEqual({ page: 0, x: 70, y: 60, width: 290, height: 220 });
  const edge = placementAfterResize(origin, "se", { x: 1000, y: 1000 }, page, page);
  expect(edge.width).toBe(450); expect(edge.height).toBe(450);
});
it("preserves logo proportions and page margins when resized", () => {
  const page = { width: 595.2756, height: 841.8898 };
  const origin = { blockIndex: 0, type: "LOGO" as const, page: 0, x: 24, y: 24, width: 120, height: 60 };
  const resized = placementAfterResize(origin, "se", { x: 40, y: 0 }, page, page);
  expect(resized.width).toBe(160); expect(resized.height).toBe(80);
  const edge = placementAfterResize(origin, "nw", { x: -1000, y: -1000 }, page, page);
  expect(edge.x).toBe(24); expect(edge.y).toBe(24);
});
