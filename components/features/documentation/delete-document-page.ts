import type { DocumentBlock } from "@/lib/entity/documentation";
import { removeTextRange } from "./document-rich-format";
import { normalizeDocumentText, type localDocumentLayout } from "./local-document-layout";

/** Deletes visible page content, including a slice of text that spans multiple pages. */
export function deleteDocumentPage(blocks: DocumentBlock[], layout: ReturnType<typeof localDocumentLayout>, page: number): DocumentBlock[] {
  if (layout.pageCount <= 1 || page < 0 || page >= layout.pageCount) return blocks;
  const remaining = blocks.flatMap((block, blockIndex): DocumentBlock[] => {
    if (block.type === "PAGE_BREAK") {
      const target = layout.pageBreaks.find(item => item.blockIndex === blockIndex)?.page;
      if (target === undefined) return [block];
      if (target === page || (page === 0 && target === 1)) return [];
      return [{ ...block, page: target > page ? target - 1 : target }];
    }
    if (block.type === "TEXT") {
      const ranges = layout.textRanges.filter(item => item.blockIndex === blockIndex && item.page === page);
      if (!ranges.length) return [block];
      let text = block.textStyles?.length ? block.text ?? "" : normalizeDocumentText(block.text ?? "");
      let textStyles=block.textStyles;
      // Descending offsets preserve all content before and after the deleted page.
      for (const range of [...ranges].reverse()) {
        if(textStyles) { const next=removeTextRange(text,textStyles,range.start,range.end); text=next.text; textStyles=next.textStyles; }
        else text=text.slice(0,range.start)+text.slice(range.end);
      }
      return text ? [{ ...block, text, ...(textStyles ? { textStyles } : {}) }] : [];
    }
    const placed = layout.placements.find(item => item.blockIndex === blockIndex);
    if (placed?.page === page) return [];
    return [block.position && block.position.page > page ? { ...block, position: { ...block.position, page: block.position.page - 1 } } : block];
  });
  return remaining.length ? remaining : [{ type: "TEXT", text: "" }];
}
