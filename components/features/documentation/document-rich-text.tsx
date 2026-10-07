"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, Mark } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { Select } from "@/components/ui/controls/select";
import type { DocumentTextStyle } from "@/lib/entity/documentation";
import { DOCUMENT_DATE_FORMATS, DOCUMENT_VARIABLES } from "@/lib/entity/documentation/variables";
import { useI18n } from "@/lib/contexts/i18n-context";
import { DOCUMENT_FAMILIES, documentFontFamily, richDocumentToText, textToRichDocument } from "./document-rich-format";

const DocumentStyle = Mark.create({
  name: "documentStyle",
  addAttributes: () => ({
    fontFamily: { default: "Roboto", parseHTML: element => DOCUMENT_FAMILIES.find(family => documentFontFamily(family) === element.style.fontFamily.replaceAll('"','')) ?? "Roboto", renderHTML: attrs => ({ style: `font-family: ${documentFontFamily(attrs.fontFamily)}` }) },
    fontSize: { default: 11, parseHTML: element => { const size = parseInt(element.style.fontSize); return size >= 6 && size <= 72 ? size : 11; }, renderHTML: attrs => ({ style: `font-size: ${attrs.fontSize}pt` }) },
  }),
  parseHTML: () => [{ tag: "span" }], renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
});
const TextLimits = Extension.create({
  name: "documentTextLimits",
  addProseMirrorPlugins: () => [new Plugin({ filterTransaction: transaction => {
    if (!transaction.docChanged) return true;
    const value=richDocumentToText(transaction.doc.toJSON());
    return value.text.length <= 100000 && value.textStyles.length <= 5000;
  } })],
});
const ParagraphAlignment = Extension.create({
  name: "documentAlignment",
  addGlobalAttributes: () => [{ types: ["paragraph"], attributes: { alignment: {
    default: "LEFT", parseHTML: element => ({ left: "LEFT", center: "CENTER", right: "RIGHT", justify: "JUSTIFY" }[element.style.textAlign] ?? "LEFT"),
    renderHTML: attrs => ({ style: `text-align: ${String(attrs.alignment).toLowerCase()}` }),
  } } }],
});

/** Structured text only: no HTML is persisted or sent to the PDF renderer. */
export function DocumentRichText({ value, textStyles, alignment, onChange, label, disabled = false, textareaClassName, autoFocus = false, toolbarTarget }: {
  value: string; textStyles?: DocumentTextStyle[]; alignment?: string;
  onChange: (text: string, styles: DocumentTextStyle[]) => void;
  label: string; disabled?: boolean; textareaClassName: string; autoFocus?: boolean; toolbarTarget?: HTMLElement | null;
}) {
  const { t } = useI18n();
  const change = useRef(onChange); change.current = onChange;
  const preserveScroll = useRef(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const pendingDate = useRef<{ from: number; to: number; scrollTop: number } | null>(null);
  const [dateFormat,setDateFormat] = useState<string>("DMY_SLASH");
  const [dateSource, setDateSource] = useState("actual");
  const editor = useEditor({
    immediatelyRender: false, shouldRerenderOnTransaction: true,
    extensions: [StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false }), DocumentStyle, ParagraphAlignment, TextLimits],
    content: textToRichDocument(value,textStyles,alignment), editable: !disabled,
    editorProps: {
      attributes: { role: "textbox", "aria-label": label, "aria-multiline": "true", class: "min-h-full outline-none text-black [&_p]:m-0 [&_p]:min-h-[16pt] [&_p]:leading-[1.45]" },
      handleScrollToSelection: () => preserveScroll.current,
      transformPastedHTML: () => "", // Clipboard text is imported without arbitrary HTML/styles.
    },
    onUpdate: ({ editor }) => { const next = richDocumentToText(editor.getJSON()); change.current(next.text,next.textStyles); },
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor,disabled]);
  useEffect(() => {
    if (!editor) return;
    const current = richDocumentToText(editor.getJSON());
    if (current.text !== value || JSON.stringify(current.textStyles) !== JSON.stringify(textStyles ?? [])) {
      // Parent updates caused by our own transaction must not reset the selection/history.
      if (current.text === value && (!textStyles || JSON.stringify(current.textStyles) === JSON.stringify(textStyles))) return;
      editor.commands.setContent(textToRichDocument(value,textStyles,alignment), { emitUpdate: false });
    }
  }, [editor,value,textStyles,alignment]);
  useEffect(() => { if (autoFocus && editor) editor.view.dom.focus({ preventScroll: true }); }, [autoFocus,editor]);
  const run = (action: () => void) => {
    if (!editor || disabled) return;
    const scrollTop = viewport.current?.scrollTop ?? 0;
    preserveScroll.current = true;
    try { action(); editor.view.dom.focus({ preventScroll: true }); }
    finally { preserveScroll.current = false; }
    if (viewport.current) viewport.current.scrollTop = scrollTop;
  };
  const restoreFocus = () => requestAnimationFrame(() => {
    if (editor && !editor.isDestroyed) editor.view.dom.focus({preventScroll:true});
  });
  const insertVariable = (key: string) => {
    run(() => editor?.commands.insertContent({type:"text",text:`{{${key}}}`}));
    // The corporate combo returns focus to its trigger after onChange. Restore the
    // editor after that close, so typing continues where the variable was inserted.
    restoreFocus();
  };
  const chooseVariable = (key: string) => {
    if (!editor || disabled) return;
    if (key !== "fecha_documento") { insertVariable(key); return; }
    pendingDate.current={from:editor.state.selection.from,to:editor.state.selection.to,scrollTop:viewport.current?.scrollTop ?? 0};
    setDateSource("actual");setDateFormat("DMY_SLASH");setDateOpen(true);
  };
  const closeDate = () => { setDateOpen(false);restoreFocus(); };
  const applyDate = () => {
    const selection=pendingDate.current;
    if (!editor || !selection || disabled) return;
    run(() => { editor.commands.setTextSelection({from:selection.from,to:selection.to});editor.commands.insertContent({type:"text",text:`{{fecha_documento:${dateSource}:${dateFormat}}}`}); });
    if(viewport.current) viewport.current.scrollTop=selection.scrollTop;
    closeDate();
  };
  const attributes = editor?.getAttributes("documentStyle");
  const controls = <div className="flex flex-wrap items-center gap-1 border-b border-hairline bg-elevated p-2 text-ink" role="toolbar" aria-label={t("documentation.textFormat")}>
    {([ ["bold", Bold], ["italic", Italic], ["underline", Underline] ] as const).map(([mark, Icon]) => <Button key={mark} type="button" size="sm" variant="outline" aria-label={t(`documentation.${mark}`)} aria-pressed={editor?.isActive(mark) ?? false} disabled={disabled || !editor} onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor?.chain().toggleMark(mark).run())}><Icon size={16} /></Button>)}
    <select className="max-w-40 rounded border border-hairline bg-elevated p-1 text-sm" aria-label={t("documentation.fontFamily")} disabled={disabled || !editor} value={attributes?.fontFamily ?? "Roboto"} onChange={e => run(() => editor?.chain().setMark("documentStyle", { fontFamily: e.target.value }).run())}>{DOCUMENT_FAMILIES.map(family => <option key={family}>{family}</option>)}</select>
    <select className="w-16 rounded border border-hairline bg-elevated p-1 text-sm" aria-label={t("documentation.fontSize")} disabled={disabled || !editor} value={attributes?.fontSize ?? 11} onChange={e => run(() => editor?.chain().setMark("documentStyle", { fontSize: Number(e.target.value) }).run())}>{[6,8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(size => <option key={size}>{size}</option>)}</select>
    {([ ["LEFT", AlignLeft], ["CENTER", AlignCenter], ["RIGHT", AlignRight], ["JUSTIFY", AlignJustify] ] as const).map(([direction, Icon]) => <Button key={direction} type="button" size="sm" variant="outline" disabled={disabled || !editor} aria-label={t(`documentation.align${direction}`)} aria-pressed={editor?.isActive("paragraph",{ alignment: direction }) ?? false} onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor?.chain().updateAttributes("paragraph", { alignment: direction }).run())}><Icon size={16} /></Button>)}
    <Button type="button" size="sm" variant="outline" disabled={disabled || !editor?.can().undo()} aria-label={t("documentation.undo")} onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor?.commands.undo())}><Undo2 size={16} /></Button>
    <Button type="button" size="sm" variant="outline" disabled={disabled || !editor?.can().redo()} aria-label={t("documentation.redo")} onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor?.commands.redo())}><Redo2 size={16} /></Button>
    <Select aria-label={t("documentation.variable")} disabled={disabled || !editor} value="" onChange={chooseVariable} placeholder={t("documentation.variable")}
      searchable searchPlaceholder={t("documentation.search")} className="w-56 max-w-full" popoverClassName="min-w-[280px] max-w-[calc(100vw-2rem)]"
      options={DOCUMENT_VARIABLES.map(item => ({ value:item.key,label:t(`documentation.${item.label}`),description:t(`documentation.${item.group}`),searchText:`${t(`documentation.${item.label}`)} ${t(`documentation.${item.group}`)}` }))} />
  </div>;
  return <div className="flex min-h-0 flex-1 flex-col">{toolbarTarget ? createPortal(controls,toolbarTarget) : controls}<div ref={viewport} className={`overflow-auto ${textareaClassName}`} style={{ fontFamily: documentFontFamily(), fontSize: "11pt" }}><EditorContent editor={editor} /></div>
    <Modal open={dateOpen} onOpenChange={open => {if(!open) closeDate();}} title={t("documentation.configureDate")} description={t("documentation.dateConfigHint")} className="overflow-visible sm:max-w-md"
      footer={<><Button type="button" variant="outline" onClick={closeDate}>{t("documentation.cancel")}</Button><Button type="button" disabled={disabled} onClick={applyDate}>{t("documentation.addDate")}</Button></>}>
      <div className="space-y-4 px-6 pb-6">
        <div className="space-y-1"><span className="text-sm font-medium">{t("documentation.dateSource")}</span><Select aria-label={t("documentation.dateSource")} disabled={disabled} value={dateSource} onChange={setDateSource}
          options={[{value:"actual",label:t("documentation.dateAtGeneration")},{value:"seleccionada",label:t("documentation.dateSelectedAtGeneration")}]} /></div>
        <div className="space-y-1"><span className="text-sm font-medium">{t("documentation.dateFormat")}</span><Select aria-label={t("documentation.dateFormat")} disabled={disabled} value={dateFormat} onChange={setDateFormat} options={DOCUMENT_DATE_FORMATS.map(item => ({value:item.value,label:item.example}))} /></div>
      </div>
    </Modal>
  </div>;
}
