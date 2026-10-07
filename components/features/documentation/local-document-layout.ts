import type { DocumentPlacement, DocumentTextStyle, TemplateInput } from "@/lib/entity/documentation";

import { styledRows } from "./styled-paragraph";
import { ELEMENT_GAP, intersects } from "./document-layout";

export const DOCUMENT_FONT = "ClinicDocumentRoboto";
export const PAGE_SIZE = { width: 595.2756, height: 841.8898 };
export interface DocumentLine { page: number; x: number; y: number; size: number; text: string; style?: DocumentTextStyle }
export type TextMeasure = (text: string, size: number, style?: DocumentTextStyle) => number;

export const normalizeDocumentText = (text: string) => text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");

/** Mirrors the PDF writer's A4 flow, baseline and spacing rules; never sends a draft to the server. */
export function localDocumentLayout(input: TemplateInput, measure: TextMeasure, logoRatio = 1) {
  const placements: DocumentPlacement[] = [];
  const lines: DocumentLine[] = [];
  const textRanges: { blockIndex: number; page: number; start: number; end: number }[] = [];
  const pageBreaks: { blockIndex: number; page: number }[] = [];
  const sizeOf = (block: TemplateInput["blocks"][number]) => {
    const requestedWidth = block.width ?? (block.type === "LOGO" ? 120 : 260);
    const height = block.type === "SIGNATURE" ? (block.height ?? 180) : Math.min(450, requestedWidth / logoRatio);
    return { width: block.type === "SIGNATURE" ? requestedWidth : height * logoRatio, height };
  };
  const obstacles: DocumentPlacement[] = input.blocks.flatMap((block, blockIndex) => block.type !== "TEXT" && block.type !== "PAGE_BREAK" && block.position
    ? [{ blockIndex, type: block.type, ...block.position, ...sizeOf(block) }] : []);
  let page = 0;
  let y = 790;
  const space = (height: number) => { if (y - height < 48) { page++; y = 790; } };
  const avoid = (x: number, width: number, height: number, above = 0) => {
    for (;;) {
      const previousPage=page; space(height);
      if (page !== previousPage && above > 0) y += 11-above;
      const top = PAGE_SIZE.height - y - above;
      const hit = obstacles.find(item => item.page === page && intersects({ x, y: top, width, height }, item, ELEMENT_GAP));
      if (!hit) return;
      y = PAGE_SIZE.height - hit.y - hit.height - ELEMENT_GAP - above;
    }
  };
  const paragraph = (text: string, size: number, blockIndex?: number) => {
    let rowStart = 0;
    const write = (row: string, end: number) => {
      avoid(48, blockIndex === undefined ? Math.max(1, measure(row, size)) : 499, size + 5, size);
      lines.push({ page, x: 48, y: PAGE_SIZE.height - y, size, text: row });
      if (blockIndex !== undefined) {
        textRanges.push({ blockIndex, page, start: rowStart, end });
        const top = PAGE_SIZE.height - y - size;
        const previous = placements[placements.length - 1];
        if (previous?.blockIndex === blockIndex && previous.page === page && Math.abs(previous.y + previous.height - top) < 0.01) previous.height = top + size + 5 - previous.y;
        else placements.push({ blockIndex, type: "TEXT", page, x: 48, y: top, width: 499, height: size + 5 });
      }
      y -= size + 5;
      rowStart = end;
    };
    const segments = normalizeDocumentText(text).split("\n");
    let cursor = 0;
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const segment = segments[segmentIndex];
      let row = "";
      for (const word of segment.split(/(?<= )/)) {
        if (row && measure(row + word, size) > 499) { write(row, cursor); row = ""; }
        for (const character of word) {
          if (row && measure(row + character, size) > 499) { write(row, cursor); row = ""; }
          row += character; cursor += character.length;
        }
      }
      if (segmentIndex < segments.length - 1) cursor++;
      write(row, cursor);
    }
    y -= 8;
  };
  y = Math.min(y, 700);
  input.blocks.forEach((block, blockIndex) => {
    if (block.type === "PAGE_BREAK") { page = Math.max(page + 1, block.page ?? 0); pageBreaks.push({ blockIndex, page }); y = 790; return; }
    if (block.type === "TEXT") {
      if (!block.textStyles?.length && (!block.alignment || block.alignment === "LEFT")) { paragraph(block.text ?? "",11,blockIndex); return; }
      for (const row of styledRows(block,measure)) {
        y += 11-row.size;
        avoid(48,499,row.size+5,row.size);
        const spaces = row.glyphs.filter(g => g.text === " ").length;
        const spacing = row.alignment === "JUSTIFY" && row.justify && spaces ? (499-row.width)/spaces : 0;
        let x = row.alignment === "RIGHT" ? 547-row.width : row.alignment === "CENTER" ? 48+(499-row.width)/2 : 48;
        let run: DocumentLine | undefined;
        for (const glyph of row.glyphs) {
          if (run && run.style === glyph.style && !spacing) run.text += glyph.text;
          else { run={ page,x,y:PAGE_SIZE.height-y,size:glyph.style?.fontSize ?? 11,text:glyph.text,style:glyph.style }; lines.push(run); }
          x += glyph.width + (glyph.text === " " ? spacing : 0);
        }
        textRanges.push({ blockIndex,page,start:row.start,end:row.end });
        const top=PAGE_SIZE.height-y-row.size, previous=placements.at(-1);
        if (previous?.blockIndex === blockIndex && previous.page === page && Math.abs(previous.y+previous.height-top)<0.01) previous.height=top+row.size+5-previous.y;
        else placements.push({ blockIndex,type:"TEXT",page,x:48,y:top,width:499,height:row.size+5 });
        y -= 16;
      }
      y -= 8; return;
    }
    const { width, height } = sizeOf(block);
    const reserved = block.type === "SIGNATURE" ? height - 5 : height + 16;
    const x = block.alignment === "RIGHT" ? 547 - width : block.alignment === "CENTER" ? (595 - width) / 2 : 48;
    if (!block.position) avoid(x, width, height);
    const placed: DocumentPlacement = { blockIndex, type: block.type, page, x, y: PAGE_SIZE.height - y, width, height, ...block.position };
    placements.push(placed);
    if (!block.position) obstacles.push(placed);
    if (!block.position) y -= reserved;
  });
  return { ...PAGE_SIZE, pageCount: Math.max(page + 1, ...placements.map(item => item.page + 1)), placements, lines, textRanges, pageBreaks };
}
