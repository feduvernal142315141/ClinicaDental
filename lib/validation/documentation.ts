import { z } from "zod";
import { validDocumentVariables } from "@/lib/entity/documentation/variables";

export const templateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  blocks: z.array(z.object({
    type: z.enum(["TEXT", "SIGNATURE", "LOGO", "PAGE_BREAK"]),
    page: z.number().int().min(1).max(99).optional(),
    text: z.string().max(100_000).refine(validDocumentVariables, "INVALID_VARIABLE").optional(),
    textStyles: z.array(z.object({
      start: z.number().int().min(0), end: z.number().int().min(1),
      fontFamily: z.enum(["Roboto", "Arial", "Times New Roman", "Courier New"]).optional(),
      fontSize: z.number().int().min(6).max(72).optional(),
      bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(),
      alignment: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFY"]).optional(),
    })).max(5000).optional(),
    alignment: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFY"]).optional(),
    width: z.number().int().min(60).max(450).optional(),
    signerRole: z.enum(["PATIENT", "SPECIALIST"]).optional(),
    height: z.number().int().min(120).max(450).optional(),
    position: z.object({
      page: z.number().int().min(0).max(99),
      x: z.number().finite().min(24).max(595.2756 - 24),
      y: z.number().finite().min(24).max(841.8898 - 24),
    }).optional(),
  })).min(1).max(100),
}).superRefine((value, ctx) => {
  if (value.blocks.reduce((n,b) => n + (b.textStyles?.length ?? 0), 0) > 10000) ctx.addIssue({ code: "custom", path: ["blocks"], message: "TOO_MANY_TEXT_STYLES" });
  value.blocks.forEach((block, index) => {
    if (block.alignment === "JUSTIFY" && block.type !== "TEXT") ctx.addIssue({code:"custom",path:["blocks",index,"alignment"],message:"INVALID_ALIGNMENT"});
    if (block.textStyles && block.type !== "TEXT") ctx.addIssue({code:"custom",path:["blocks",index,"textStyles"],message:"INVALID_TEXT_STYLE"});
    let previousEnd = 0;
    block.textStyles?.forEach((style, styleIndex) => {
      if (block.type !== "TEXT" || style.start < previousEnd || style.end <= style.start || style.end > (block.text?.length ?? 0)) ctx.addIssue({ code: "custom", path: ["blocks", index, "textStyles", styleIndex], message: "INVALID_TEXT_STYLE" });
      previousEnd = style.end;
    });
    if (block.type === "PAGE_BREAK") {
      if (block.position || block.height !== undefined || block.width !== undefined || block.alignment || block.text) ctx.addIssue({ code: "custom", path: ["blocks", index], message: "INVALID_PAGE_BREAK" });
    } else if (block.page !== undefined) ctx.addIssue({ code: "custom", path: ["blocks", index, "page"], message: "INVALID_PAGE_TARGET" });
    if (block.signerRole !== undefined && block.type !== "SIGNATURE") ctx.addIssue({ code: "custom", path: ["blocks", index, "signerRole"], message: "INVALID_SIGNER_ROLE" });
    if (block.height !== undefined && block.type !== "SIGNATURE") ctx.addIssue({ code: "custom", path: ["blocks", index, "height"], message: "INVALID_HEIGHT" });
    if (!block.position) return;
    const width = block.width ?? 260;
    if ((block.type === "TEXT" || block.type === "PAGE_BREAK") || (block.type === "SIGNATURE" && (
      width < 200 || block.position.x + width > 595.2756 - 24 || block.position.y + (block.height ?? 180) > 841.8898 - 24
    ))) ctx.addIssue({ code: "custom", path: ["blocks", index, "position"], message: "POSITION_OUTSIDE_PAGE" });
  });
  if (!value.blocks.some(b => b.type === "TEXT" && b.text?.trim())) {
    ctx.addIssue({ code: "custom", path: ["blocks"], message: "TEXT_REQUIRED" });
  }
  const signatures = value.blocks.filter(b => b.type === "SIGNATURE").length;
  if (!value.blocks.some(b => b.type === "SIGNATURE" && b.signerRole !== "SPECIALIST") || signatures < 1 || signatures > 5 || value.blocks.filter(b => b.type === "LOGO").length > 3) {
    ctx.addIssue({ code: "custom", path: ["blocks"], message: "SIGNATURE_REQUIRED" });
  }
  if (value.blocks.reduce((n, b) => n + (b.text?.length ?? 0), 0) > 100_000) {
    ctx.addIssue({ code: "custom", path: ["blocks"], message: "TEXT_TOO_LONG" });
  }
});
export type TemplateForm = z.infer<typeof templateSchema>;
export const validImportFile = (file: File) =>
  /\.(pdf|docx?|png|jpe?g)$/i.test(file.name) && file.size > 0 && file.size <= 10 * 1024 * 1024;
