import type { JSONContent } from "@tiptap/react";
import type { DocumentTextStyle } from "@/lib/entity/documentation";
export const DOCUMENT_FAMILIES = ["Roboto", "Arial", "Times New Roman", "Courier New"] as const;
export const documentFontFamily = (family = "Roboto") => `ClinicDocument${family.replaceAll(" ", "")}`;
export const documentFontFile = (family: string, bold = false, italic = false) => family === "Roboto"
  ? `Roboto-${bold ? italic ? "BoldItalic" : "Bold" : italic ? "Italic" : "Regular"}.ttf`
  : `${family}${bold ? " Bold" : ""}${italic ? " Italic" : ""}.ttf`;
export function textStyleAt(styles: DocumentTextStyle[] | undefined, offset: number): DocumentTextStyle | undefined {
  // Binary search keeps layout work bounded for large imported documents.
  let lo = 0, hi = (styles?.length ?? 0) - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; const style = styles![mid]; if (offset < style.start) hi = mid - 1; else if (offset >= style.end) lo = mid + 1; else return style; }
}
const styleMarks = (style?: DocumentTextStyle): JSONContent["marks"] => [
  { type: "documentStyle", attrs: { fontFamily: style?.fontFamily ?? "Roboto", fontSize: style?.fontSize ?? 11 } },
  ...(style?.bold ? [{ type: "bold" }] : []), ...(style?.italic ? [{ type: "italic" }] : []), ...(style?.underline ? [{ type: "underline" }] : []),
];
export function textToRichDocument(text: string, styles?: DocumentTextStyle[], alignment = "LEFT"): JSONContent {
  let offset = 0;
  return { type: "doc", content: text.replace(/\r\n?/g,"\n").split("\n").map(paragraph => {
    const start = offset, content: JSONContent[] = [];
    for (let i = 0; i < paragraph.length;) {
      const style = textStyleAt(styles, offset + i);
      let end = i + 1; while (end < paragraph.length && textStyleAt(styles,offset+end) === style) end++;
      content.push({ type: "text", text: paragraph.slice(i,end), marks: styleMarks(style) }); i = end;
    }
    offset += paragraph.length + 1;
    return { type: "paragraph", attrs: { alignment: textStyleAt(styles,start)?.alignment ?? alignment }, content };
  }) };
}
export function richDocumentToText(doc: JSONContent): { text: string; textStyles: DocumentTextStyle[] } {
  let text = "";
  const textStyles: DocumentTextStyle[] = [];
  const append = (value: string, style: Omit<DocumentTextStyle,"start"|"end">) => {
    if (!value) return;
    const start = text.length; text += value;
    const previous = textStyles.at(-1);
    if (previous && Object.entries(style).every(([key,value]) => previous[key as keyof DocumentTextStyle] === value)) previous.end = text.length;
    else textStyles.push({ start, end: text.length, ...style });
  };
  doc.content?.forEach((paragraph, index) => {
    const alignment = paragraph.attrs?.alignment ?? "LEFT";
    const nodes = paragraph.content ?? [];
    nodes.forEach(node => {
      const attrs = node.marks?.find(mark => mark.type === "documentStyle")?.attrs;
      append(node.type === "hardBreak" ? "\n" : node.text ?? "", {
        fontFamily: attrs?.fontFamily ?? "Roboto", fontSize: Number(attrs?.fontSize ?? 11),
        bold: !!node.marks?.some(mark => mark.type === "bold"), italic: !!node.marks?.some(mark => mark.type === "italic"), underline: !!node.marks?.some(mark => mark.type === "underline"), alignment,
      });
    });
    if (index < (doc.content?.length ?? 0) - 1) append("\n", { fontFamily: "Roboto", fontSize: 11, bold: false, italic: false, underline: false, alignment });
  });
  return { text, textStyles };
}

export function removeTextRange(text: string, styles: DocumentTextStyle[], start: number, end: number) {
  const textStyles = styles.flatMap(style => {
    const parts: DocumentTextStyle[] = [];
    if (style.start < start) { const leftEnd=Math.min(style.end,start); if(leftEnd>style.start) parts.push({ ...style,end:leftEnd }); }
    if (style.end > end) { const rightStart=Math.max(style.start,end); parts.push({ ...style,start:rightStart-(end-start),end:style.end-(end-start) }); }
    return parts;
  });
  return { text: text.slice(0,start)+text.slice(end), textStyles };
}
