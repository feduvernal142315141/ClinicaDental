import type { DocumentBlock, DocumentPlacement, DocumentPosition } from "@/lib/entity/documentation";

export const PDF_MARGIN = 24;
export const SIGNATURE_HEIGHT = 180;
export const MIN_SIGNATURE_HEIGHT = 120;
export const MIN_FREE_SIGNATURE_WIDTH = 200;

export function clampPlacement(
  position: DocumentPosition,
  size: { width: number; height: number },
  page: { width: number; height: number },
): DocumentPosition {
  // Round down so edge coordinates never exceed the backend's fractional A4 bounds.
  const clamp = (value: number, upper: number) => Math.floor(Math.max(PDF_MARGIN, Math.min(value, upper)) * 100) / 100;
  return {
    page: position.page,
    x: clamp(position.x, page.width - PDF_MARGIN - size.width),
    y: clamp(position.y, page.height - PDF_MARGIN - size.height),
  };
}

export function freePlacementSize(block: DocumentBlock, placement: DocumentPlacement) {
  return block.type === "SIGNATURE"
    ? { width: Math.max(MIN_FREE_SIGNATURE_WIDTH, block.width ?? placement.width), height: block.height ?? SIGNATURE_HEIGHT }
    : { width: placement.width, height: placement.height };
}

export function placementAfterDrag(
  origin: DocumentPosition,
  delta: { x: number; y: number },
  bounds: { width: number; height: number },
  size: { width: number; height: number },
  page: { width: number; height: number },
): DocumentPosition {
  if (bounds.width <= 0 || bounds.height <= 0) return origin;
  return clampPlacement({
    page: origin.page,
    x: origin.x + delta.x * page.width / bounds.width,
    y: origin.y + delta.y * page.height / bounds.height,
  }, size, page);
}

export const ELEMENT_GAP = 8;
export function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, gap = 0) {
  return a.x < b.x + b.width + gap - 0.001 && a.x + a.width + gap - 0.001 > b.x && a.y < b.y + b.height + gap - 0.001 && a.y + a.height + gap - 0.001 > b.y;
}

/** Find the nearest legal position around other shapes; text is reflowed separately. */
export function positionWithoutOverlap(position: DocumentPosition, size: { width: number; height: number }, page: { width: number; height: number }, others: DocumentPlacement[]): DocumentPosition | null {
  const obstacles = others.filter(item => item.type !== "TEXT" && item.page === position.page);
  const origin = clampPlacement(position, size, page);
  const xs = [origin.x, PDF_MARGIN, ...obstacles.flatMap(item => [item.x - size.width - ELEMENT_GAP, item.x + item.width + ELEMENT_GAP])];
  const ys = [origin.y, PDF_MARGIN, ...obstacles.flatMap(item => [item.y - size.height - ELEMENT_GAP, item.y + item.height + ELEMENT_GAP])];
  let closest: DocumentPosition | null = null;
  let distance = Infinity;
  for (const x of xs) for (const y of ys) {
    const candidate = clampPlacement({ page: position.page, x, y }, size, page);
    if (obstacles.some(item => intersects({ ...candidate, ...size }, item))) continue;
    const delta = (candidate.x - origin.x) ** 2 + (candidate.y - origin.y) ** 2;
    if (delta < distance) { distance = delta; closest = candidate; }
  }
  return closest;
}

export type ResizeCorner = "nw" | "ne" | "sw" | "se";
/** Keeps the opposite corner anchored and converts display pixels to PDF points. */
export function placementAfterResize(origin: DocumentPlacement, corner: ResizeCorner, delta: { x: number; y: number }, bounds: { width: number; height: number }, page: { width: number; height: number }) {
  const west = corner.endsWith("w"), north = corner.startsWith("n");
  const dx = bounds.width > 0 ? delta.x * page.width / bounds.width : 0;
  const dy = bounds.height > 0 ? delta.y * page.height / bounds.height : 0;
  const availableWidth = west ? origin.x + origin.width - PDF_MARGIN : page.width - PDF_MARGIN - origin.x;
  const availableHeight = north ? origin.y + origin.height - PDF_MARGIN : page.height - PDF_MARGIN - origin.y;
  let width: number, height: number;
  if (origin.type === "LOGO") {
    const ratio = origin.width / origin.height;
    const horizontal = dx * (west ? -1 : 1), vertical = dy * (north ? -1 : 1) * ratio;
    const change = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
    const maximum = Math.min(450, 450 * ratio, availableWidth, availableHeight * ratio);
    width = Math.max(Math.min(60, maximum), Math.min(maximum, origin.width + change));
    height = width / ratio;
  } else {
    width = Math.max(MIN_FREE_SIGNATURE_WIDTH, Math.min(450, availableWidth, origin.width + dx * (west ? -1 : 1)));
    height = Math.max(MIN_SIGNATURE_HEIGHT, Math.min(450, availableHeight, origin.height + dy * (north ? -1 : 1)));
  }
  width = Math.floor(width);
  if (origin.type === "LOGO") height = width * origin.height / origin.width;
  else height = Math.floor(height);
  const position = clampPlacement({ page: origin.page, x: west ? origin.x + origin.width - width : origin.x, y: north ? origin.y + origin.height - height : origin.y }, { width, height }, page);
  return { ...position, width, height };
}
