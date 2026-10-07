import type { DocumentBlock, DocumentTextStyle } from "@/lib/entity/documentation";
import { textStyleAt } from "./document-rich-format";
export interface StyledGlyph { text: string; start: number; end: number; style?: DocumentTextStyle; width: number }
export interface StyledRow { glyphs: StyledGlyph[]; start: number; end: number; size: number; width: number; alignment: string; justify: boolean }
/** Common Word-style wrapping: the PDF writer uses the same glyph/word boundaries. */
export function styledRows(block: DocumentBlock, measure: (text: string, size: number, style?: DocumentTextStyle) => number): StyledRow[] {
  const text = block.text ?? "", rows: StyledRow[] = [];
  let glyphs: StyledGlyph[] = [], width = 0, start = 0;
  let alignment = textStyleAt(block.textStyles,0)?.alignment ?? block.alignment ?? "LEFT";
  const write = (end: number, justify: boolean) => {
    rows.push({ glyphs, start, end, size: Math.max(glyphs.length ? 0 : 11, ...glyphs.map(g => g.style?.fontSize ?? 11)), width, alignment, justify });
    glyphs = []; width = 0; start = end;
  };
  let word: StyledGlyph[] = [];
  const flush = () => {
    if (glyphs.length && width + word.reduce((sum,g) => sum+g.width,0) > 499) write(word[0].start,true);
    for (const g of word) { if (glyphs.length && width + g.width > 499) write(g.start,true); glyphs.push(g); width += g.width; }
    word = [];
  };
  for (let offset = 0; offset < text.length;) {
    const cp = text.codePointAt(offset)!, value = String.fromCodePoint(cp), style = textStyleAt(block.textStyles,offset);
    const end = offset + value.length;
    if (value === "\n" || value === "\r") {
      const newlineEnd = value === "\r" && text[end] === "\n" ? end+1 : end;
      flush(); write(newlineEnd,false); offset = newlineEnd;
      alignment = textStyleAt(block.textStyles,offset)?.alignment ?? block.alignment ?? "LEFT"; continue;
    }
    const expanded = value === "\t" ? "    " : value;
    word.push({ text: expanded, start: offset, end, style, width: measure(expanded,style?.fontSize ?? 11,style) });
    if (value === " " || value === "\t") flush();
    offset = end;
  }
  flush(); write(text.length,false); return rows;
}
