"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { DocumentBlock, DocumentPlacement, DocumentPosition, DocumentTextStyle, SignerRole, TemplateInput } from "@/lib/entity/documentation";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { DOCUMENT_FONT, localDocumentLayout, type TextMeasure } from "./local-document-layout";
import { ELEMENT_GAP, MIN_SIGNATURE_HEIGHT, intersects, freePlacementSize, placementAfterDrag, placementAfterResize, positionWithoutOverlap, type ResizeCorner } from "./document-layout";

import { DocumentRichText } from "./document-rich-text";
import { DOCUMENT_FAMILIES, documentFontFamily, documentFontFile } from "./document-rich-format";
import { deleteDocumentPage } from "./delete-document-page";

type DragState = {
  pointerId: number;
  blockIndex: number;
  clientX: number;
  clientY: number;
  origin: DocumentPosition;
  bounds: { width: number; height: number };
  size: { width: number; height: number };
};

/** Edits and page rendering stay local until the parent form is explicitly saved. */
export function TemplateLayoutDesigner({ input, onChange, onAdd, onRemove, onMove, onReplace, disabled = false }: {
  input: TemplateInput;
  onChange: (blockIndex: number, block: DocumentBlock) => void;
  onAdd?: (type: DocumentBlock["type"], page?: number, position?: DocumentPosition, signerRole?: SignerRole) => void;
  onRemove?: (index: number) => void;
  onReplace?: (blocks: DocumentBlock[]) => void;
  onMove?: (index: number, delta: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const hintId = useId();
  const [page, setPage] = useState(0);
  const { logoUrl } = useClinicBranding();
  const [measure, setMeasure] = useState<TextMeasure>(() => (text: string, size: number) => text.length * size * 0.5);
  const [loading, setLoading] = useState(true);
  const [logoRatio, setLogoRatio] = useState(1);
  const [blocks, setBlocks] = useState(input.blocks);
  const draft = useRef(input);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [variableToolbar, setVariableToolbar] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(100);
  draft.current = { ...input, blocks };
  useEffect(() => { setBlocks(input.blocks); }, [input.blocks]);
  const pageElement = useRef<HTMLDivElement>(null);
  const viewportElement = useRef<HTMLDivElement>(null);
  useEffect(() => { if (viewportElement.current) { viewportElement.current.scrollTop = 0; viewportElement.current.scrollLeft = 0; } }, [page]);
  const drag = useRef<DragState | null>(null);
  const resize = useRef<{ pointerId: number; corner: ResizeCorner; origin: DocumentPlacement; clientX: number; clientY: number; bounds: { width: number; height: number } } | null>(null);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      await Promise.allSettled(DOCUMENT_FAMILIES.flatMap(family => [false,true].flatMap(bold => [false,true].map(async italic => {
        const font = await new FontFace(documentFontFamily(family), `url("/documentation/${documentFontFile(family,bold,italic)}")`, { weight: bold ? "700" : "400", style: italic ? "italic" : "normal" }).load();
        document.fonts.add(font);
      }))));
      if (!active) return;
      const context = document.createElement("canvas").getContext("2d");
      if (context) context.fontKerning = "none";
      if (context) setMeasure(() => (text: string, size: number, style?: DocumentTextStyle) => {
        context.font = `${style?.italic ? "italic" : "normal"} ${style?.bold ? "700" : "400"} ${size}px ${documentFontFamily(style?.fontFamily)}`;
        return context.measureText(text).width;
      });
      setLoading(false);
    };
    void prepare();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    setLogoRatio(1);
    if (!logoUrl) return;
    const image = new Image();
    image.onload = () => { if (image.naturalWidth && image.naturalHeight) setLogoRatio(image.naturalWidth / image.naturalHeight); };
    image.src = logoUrl;
    return () => { image.onload = null; };
  }, [logoUrl]);
  const layout = useMemo(() => ({ ...localDocumentLayout({
    name: input.name.trim() || t("documentation.newTemplate"),
    blocks: blocks.map(block => block.type === "TEXT" && !block.text?.trim() ? { ...block, text: t("documentation.emptyText") } : block),
  }, measure, logoRatio), page, logoDataUrl: logoUrl }), [input.name, blocks, measure, logoRatio, logoUrl, page, t]);
  useEffect(() => { if (page >= layout.pageCount) setPage(layout.pageCount - 1); }, [page, layout.pageCount]);
  const placements: DocumentPlacement[] = layout.placements;
  const applyPosition = (placement: DocumentPlacement, position: DocumentPosition) => {
    if (!layout || loading || disabled) return;
    const block = draft.current.blocks[placement.blockIndex];
    if (!block || block.type === "TEXT") return;
    const size = freePlacementSize(block, placement);
    const resolved = positionWithoutOverlap(position, size, layout, placements.filter(item => item.blockIndex !== placement.blockIndex && draft.current.blocks[item.blockIndex]?.position));
    if (!resolved) return;
    const changed: DocumentBlock = {
      ...block,
      ...(block.type === "SIGNATURE" ? { width: size.width } : {}),
      position: resolved,
    };
    const next = draft.current.blocks.map((value, index) => index === placement.blockIndex ? changed : value);
    draft.current = { ...draft.current, blocks: next };
    setBlocks(next);
    onChange(placement.blockIndex, changed);
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, placement: DocumentPlacement) => {
    if (!layout || loading || disabled || placement.type === "TEXT" || event.isPrimary === false || event.button > 0) return;
    const bounds = pageElement.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelected(placement.blockIndex);
    drag.current = {
      pointerId: event.pointerId, blockIndex: placement.blockIndex, clientX: event.clientX, clientY: event.clientY,
      origin: { page, x: placement.x, y: placement.y }, bounds,
      size: freePlacementSize(draft.current.blocks[placement.blockIndex], placement),
    };
  };
  const dragMove = (event: PointerEvent<HTMLButtonElement>, placement: DocumentPlacement) => {
    const active = drag.current;
    if (!active || !layout || active.pointerId !== event.pointerId || active.blockIndex !== placement.blockIndex) return;
    const delta = { x: event.clientX - active.clientX, y: event.clientY - active.clientY };
    if (delta.x === 0 && delta.y === 0) return;
    applyPosition(placement, placementAfterDrag(active.origin, delta, active.bounds, active.size, layout));
  };
  const keyboardMove = (event: KeyboardEvent<HTMLButtonElement>, placement: DocumentPlacement) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    const delta = moves[event.key];
    if (!delta || placement.type === "TEXT") return;
    event.preventDefault();
    applyPosition(placement, { page, x: placement.x + delta.x, y: placement.y + delta.y });
  };
  const selectedPlacement = placements.find(item => item.blockIndex === selected);
  const ready = !loading && !!layout && layout.page === page;
  const changeBlock = (index: number, block: DocumentBlock) => {
    const next = draft.current.blocks.map((value, i) => i === index ? block : value);
    draft.current = { ...draft.current, blocks: next }; setBlocks(next); onChange(index, block);
  };
  const applyResize = (origin: DocumentPlacement, corner: ResizeCorner, delta: { x: number; y: number }, bounds: { width: number; height: number }) => {
    if (disabled || loading || origin.type === "TEXT") return;
    const changed = placementAfterResize(origin, corner, delta, bounds, layout);
    if (placements.some(item => item.blockIndex !== origin.blockIndex && item.page === changed.page && item.type !== "TEXT" && draft.current.blocks[item.blockIndex]?.position && intersects(changed, item, ELEMENT_GAP))) return;
    const block = draft.current.blocks[origin.blockIndex];
    changeBlock(origin.blockIndex, { ...block, width: Math.max(60, changed.width), ...(block.type === "SIGNATURE" ? { height: changed.height } : {}), position: { page: changed.page, x: changed.x, y: changed.y } });
  };
  const startResize = (event: PointerEvent<HTMLButtonElement>, placement: DocumentPlacement, corner: ResizeCorner) => {
    if (disabled || loading || event.isPrimary === false || event.button > 0) return;
    const bounds = pageElement.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = null; setEditing(null); setSelected(placement.blockIndex);
    resize.current = { pointerId: event.pointerId, origin: placement, corner, clientX: event.clientX, clientY: event.clientY, bounds };
  };
  const selectedBlock = blocks[selected];
  const changeDimensions = (width: number, height = selectedBlock?.height ?? 180) => {
    if (disabled || loading || !selectedBlock || !selectedPlacement) return;
    const minimumWidth = selectedBlock.type === "SIGNATURE" && selectedBlock.position ? 200 : 60;
    if (!Number.isInteger(width) || width < minimumWidth || width > 450 || (selectedBlock.type === "SIGNATURE" && (!Number.isInteger(height) || height < MIN_SIGNATURE_HEIGHT || height > 450))) return;
    const block = { ...selectedBlock, width, ...(selectedBlock.type === "SIGNATURE" ? { height } : {}) };
    if (block.position) {
      const size = selectedBlock.type === "SIGNATURE" ? { width, height } : { width: Math.min(450, width / logoRatio) * logoRatio, height: Math.min(450, width / logoRatio) };
      const position = positionWithoutOverlap(block.position, size, layout, placements.filter(item => item.blockIndex !== selected && draft.current.blocks[item.blockIndex]?.position));
      if (!position) return;
      block.position = position;
    }
    changeBlock(selected, block);
  };
  return <div className="relative rounded-xl border border-hairline bg-elevated">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-3">
        {(["TEXT", "SIGNATURE", "LOGO"] as const).map(type => <Button key={type} type="button" size="sm" variant="outline" disabled={disabled || blocks.length >= 100} onClick={() => {
          let position: DocumentPosition | undefined;
          if (type === "LOGO") {
            const height = Math.min(450, 120 / logoRatio);
            const anchor = selectedPlacement?.page === page ? selectedPlacement : undefined;
            const desired = { page, x: 48, y: anchor ? anchor.y + (anchor.type === "TEXT" ? anchor.height + ELEMENT_GAP : 0) : 24 };
            position = positionWithoutOverlap(desired, { width: height * logoRatio, height }, layout, placements.filter(item => draft.current.blocks[item.blockIndex]?.position)) ?? undefined;
            if (!position) return;
          }
          setEditing(null); setSelected(blocks.length); onAdd?.(type, undefined, position);
        }}>+ {t(type === "SIGNATURE" ? "documentation.patientSignature" : `documentation.${type}`)}</Button>)}
        <Button type="button" size="sm" variant="outline" disabled={disabled || loading || blocks.length >= 100} onClick={() => { setEditing(null); setSelected(blocks.length); onAdd?.("SIGNATURE", undefined, undefined, "SPECIALIST"); }}>+ {t("documentation.specialistSignature")}</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled || loading || !onAdd || blocks.length >= 100 || layout.pageCount >= 100} onClick={() => {
          const target = layout.pageCount;
          const next = [...draft.current.blocks, { type: "PAGE_BREAK" as const, page: target }];
          draft.current = { ...draft.current, blocks: next }; setBlocks(next);
          setEditing(null); setSelected(blocks.length); setPage(target);
          onAdd?.("PAGE_BREAK", target);
        }}>+ {t("documentation.addPage")}</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled || loading || !onReplace || layout.pageCount <= 1} onClick={() => {
          const next = deleteDocumentPage(draft.current.blocks, layout, page);
          draft.current = { ...draft.current, blocks: next }; setBlocks(next);
          drag.current = null; resize.current = null; setEditing(null); setSelected(0);
          setPage(value => Math.min(value, layout.pageCount - 2)); onReplace?.(next);
        }}>{t("documentation.deletePage")}</Button>
      </div>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-end gap-2 border-b border-hairline bg-elevated px-3 py-2 shadow-sm">
          <div ref={setVariableToolbar} data-testid="document-variable-toolbar" className={editing !== null ? "mr-auto w-full min-w-0 sm:w-auto sm:flex-1" : "hidden"} />
          <Button type="button" size="sm" variant="outline" disabled={loading || page === 0} onClick={() => { setEditing(null); setPage(value => value - 1); }}>{t("documentation.previous")}</Button>
          <span className="text-sm">{t("documentation.page")} {page + 1} / {layout?.pageCount ?? "…"}</span>
          <Button type="button" size="sm" variant="outline" disabled={!ready || page >= (layout?.pageCount ?? 1) - 1} onClick={() => { setEditing(null); setPage(value => value + 1); }}>{t("documentation.next")}</Button>
          <select aria-label={t("documentation.zoom")} value={zoom} onChange={event => setZoom(Number(event.target.value))} className="rounded-lg border border-hairline bg-elevated p-2 text-sm">
            {[75, 100, 125, 150].map(value => <option value={value} key={value}>{value}%</option>)}
          </select>
      </div>
      <p id={hintId} className="px-3 py-2 text-sm text-subtle">{t("documentation.canvasHint")} {t("documentation.resizeHint")}</p>
      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
      {loading && <p role="status">{t("documentation.loading")}</p>}
      <div ref={viewportElement} className="h-[72dvh] min-h-[420px] overflow-auto bg-muted/40 p-3 sm:p-6">
        {ready && layout && <div ref={pageElement} data-testid="layout-page" className="relative mx-auto bg-white shadow" style={{ width: `${zoom}%`, maxWidth: `${795 * zoom / 100}px`, aspectRatio: `${layout.width} / ${layout.height}` }}>
          <svg role="img" aria-label={t("documentation.pageBackground")} viewBox={`0 0 ${layout.width} ${layout.height}`} className="pointer-events-none absolute inset-0 h-full w-full select-none">
            {layout.lines.filter(line => line.page === page).map((line, index) => <text key={index} x={line.x} y={line.y} fontSize={line.size} fontFamily={`${line.style ? documentFontFamily(line.style.fontFamily) : DOCUMENT_FONT}, sans-serif`} fontWeight={line.style?.bold ? 700 : 400} fontStyle={line.style?.italic ? "italic" : "normal"} textDecoration={line.style?.underline ? "underline" : undefined} style={{ fontKerning: "none", fontVariantLigatures: "none" }} fill="black" xmlSpace="preserve">{line.text}</text>)}
          </svg>
          {placements.filter(item => item.page === page).map(placement => <Fragment key={placement.type === "TEXT" ? `${placement.blockIndex}-${placement.page}-${placement.y}` : placement.blockIndex}><button type="button"
            aria-label={`${t(`documentation.${placement.type}`)} ${placement.blockIndex + 1}`} aria-describedby={hintId} aria-pressed={selected === placement.blockIndex}
            className={`absolute touch-none overflow-hidden ${placement.type === "TEXT" ? "border border-transparent hover:border-blue-500 bg-transparent" : "border-2"} text-left text-slate-900 outline-none focus-visible:ring-4 focus-visible:ring-blue-400 ${selected === placement.blockIndex ? "ring-2 ring-blue-600" : ""}`}
            style={{ left: `${placement.x / layout.width * 100}%`, top: `${placement.y / layout.height * 100}%`, width: `${placement.width / layout.width * 100}%`, height: `${placement.height / layout.height * 100}%`, cursor: placement.type === "TEXT" ? "text" : "grab", minHeight: placement.type === "TEXT" ? 24 : undefined }}
            onFocus={() => setSelected(placement.blockIndex)} onClick={() => { setSelected(placement.blockIndex); if (placement.type === "TEXT") setEditing(placement.blockIndex); }}
            onPointerDown={event => startDrag(event, placement)} onPointerMove={event => dragMove(event, placement)}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={event => keyboardMove(event, placement)}>
            {placement.type === "TEXT" ? <span className="sr-only">{t("documentation.editText")}</span> : placement.type === "LOGO" && layout.logoDataUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={layout.logoDataUrl} alt={t("documentation.LOGO")} draggable={false} className="pointer-events-none h-full w-full object-contain" /> :
              <span className="pointer-events-none flex h-full flex-col justify-between p-1 text-[clamp(8px,1.4vw,14px)] sm:p-3">
                <span className="font-semibold">{t(placement.type === "SIGNATURE" ? blocks[placement.blockIndex]?.signerRole === "SPECIALIST" ? "documentation.specialistSignature" : "documentation.patientSignature" : `documentation.${placement.type}`)}</span>
                <span className="border-t border-slate-400 pt-1">{t(placement.type === "SIGNATURE" ? blocks[placement.blockIndex]?.signerRole === "SPECIALIST" ? "documentation.specialistPreview" : "documentation.signaturePreview" : "documentation.logoUnavailable")}</span>
              </span>}
          </button>
          {placement.type !== "TEXT" && selected === placement.blockIndex && !disabled && (["nw", "ne", "sw", "se"] as const).map(corner => <button key={corner} type="button"
            aria-label={`${t("documentation.resize")} ${t(`documentation.${placement.type}`)} ${placement.blockIndex + 1} · ${t(({ nw: "documentation.resizeNW", ne: "documentation.resizeNE", sw: "documentation.resizeSW", se: "documentation.resizeSE" } as const)[corner])}`}
            aria-describedby={hintId}
            className="absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border-2 border-white bg-blue-600 shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:h-4 sm:w-4"
            style={{ left: `${(placement.x + (corner.endsWith("e") ? placement.width : 0)) / layout.width * 100}%`, top: `${(placement.y + (corner.startsWith("s") ? placement.height : 0)) / layout.height * 100}%`, cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize" }}
            onPointerDown={event => startResize(event, placement, corner)}
            onPointerMove={event => { const active = resize.current; if (active && active.pointerId === event.pointerId) applyResize(active.origin, active.corner, { x: event.clientX - active.clientX, y: event.clientY - active.clientY }, active.bounds); }}
            onPointerUp={() => { resize.current = null; }} onPointerCancel={() => { resize.current = null; }} onLostPointerCapture={() => { resize.current = null; }}
            onKeyDown={event => { const step = event.shiftKey ? 10 : 1; const delta = ({ ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } } as Record<string, { x: number; y: number }>)[event.key]; if (delta) { event.preventDefault(); applyResize(placement, corner, delta, layout); } }}
          />)}
          </Fragment>)}
          {editing !== null && placements.find(item => item.blockIndex === editing && item.page === page) && (() => {
            const area = placements.find(item => item.blockIndex === editing && item.page === page)!;
            return <div className="absolute z-20 flex flex-col rounded border-2 border-blue-600 bg-white shadow-lg" style={{ minHeight: 240, left: `${area.x / layout.width * 100}%`, top: `${Math.min(area.y, layout.height - 220) / layout.height * 100}%`, width: `${area.width / layout.width * 100}%`, height: `${Math.min(Math.max(180, area.height), layout.height - Math.min(area.y, layout.height - 220) - 24) / layout.height * 100}%` }}>
              <DocumentRichText toolbarTarget={variableToolbar} autoFocus label={`${t("documentation.TEXT")} ${editing + 1}`} disabled={disabled} value={blocks[editing]?.text ?? ""} textStyles={blocks[editing]?.textStyles} alignment={blocks[editing]?.alignment} onChange={(text,textStyles) => changeBlock(editing, { ...blocks[editing], text, textStyles })} textareaClassName="min-h-0 flex-1 resize-none bg-white p-2 font-sans text-sm text-slate-900 outline-none" />
              <button type="button" onClick={() => setEditing(null)} className="bg-blue-600 px-3 py-2 text-sm text-white">{t("documentation.applyText")}</button>
            </div>;
          })()}

        </div>}
      </div>
      </div>
      <aside className="space-y-4 border-t border-hairline p-4 lg:border-l lg:border-t-0">
        <label className="block space-y-2 text-sm"><span>{t("documentation.selectElement")}</span><select aria-label={t("documentation.selectElement")} value={selected} onChange={event => { setEditing(null); setSelected(Number(event.target.value)); }} className="w-full rounded-lg border border-hairline bg-elevated p-2">
          {blocks.map((block, index) => <option value={index} key={index}>{index + 1}. {t(block.type === "SIGNATURE" ? block.signerRole === "SPECIALIST" ? "documentation.specialistSignature" : "documentation.patientSignature" : `documentation.${block.type}`)}</option>)}
        </select></label>
        {selectedBlock?.type === "TEXT" ? <div className="space-y-2"><p className="text-xs text-subtle">{t("documentation.variablesHint")}</p><Button type="button" variant="outline" disabled={loading || disabled} onClick={() => { if (selectedPlacement) setPage(selectedPlacement.page); setEditing(selected); }}>{t("documentation.editText")}</Button>
          {editing === selected && !selectedPlacement && <>
            <DocumentRichText toolbarTarget={variableToolbar} label={`${t("documentation.TEXT")} ${selected + 1}`} disabled={disabled} value={selectedBlock.text ?? ""} textStyles={selectedBlock.textStyles} alignment={selectedBlock.alignment} onChange={(text,textStyles) => changeBlock(selected, { ...selectedBlock, text, textStyles })} textareaClassName="h-64 w-full rounded-lg border border-hairline bg-elevated p-2 text-sm" />
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("documentation.applyText")}</Button>
          </>}
        </div> : selectedBlock?.type === "PAGE_BREAK" ? <p className="text-sm text-subtle">{t("documentation.pageBreakHint")}</p> : selectedBlock && <>
          {selectedBlock.type === "SIGNATURE" && <label className="block space-y-2 text-sm"><span>{t("documentation.signerRole")}</span><select disabled={disabled} aria-label={t("documentation.signerRole")} value={selectedBlock.signerRole ?? "PATIENT"} onChange={event => changeBlock(selected, { ...selectedBlock, signerRole: event.target.value as SignerRole })} className="w-full rounded-lg border border-hairline bg-elevated p-2">
            <option value="PATIENT">{t("documentation.patientSignature")}</option><option value="SPECIALIST">{t("documentation.specialistSignature")}</option>
          </select></label>}
          <label className="block space-y-1 text-sm"><span>{t("documentation.width")}</span><Input aria-label={t("documentation.width")} type="number" step={1} min={selectedBlock.type === "SIGNATURE" && selectedBlock.position ? 200 : 60} max={450} disabled={disabled || !ready || !selectedPlacement} value={selectedBlock.width ?? (selectedBlock.type === "LOGO" ? 120 : 260)} onChange={event => changeDimensions(Number(event.target.value))} /></label>
          {selectedBlock.type === "SIGNATURE" && <label className="block space-y-1 text-sm"><span>{t("documentation.height")}</span><Input aria-label={t("documentation.height")} type="number" step={1} min={MIN_SIGNATURE_HEIGHT} max={450} disabled={disabled || !ready || !selectedPlacement} value={selectedBlock.height ?? 180} onChange={event => changeDimensions(selectedBlock.width ?? 260, Number(event.target.value))} /></label>}
          <div className="grid grid-cols-2 gap-2">
            {(["x", "y"] as const).map(axis => <label key={axis} className="block space-y-1 text-sm"><span>{t(axis === "x" ? "documentation.positionX" : "documentation.positionY")}</span><Input aria-label={t(axis === "x" ? "documentation.positionX" : "documentation.positionY")} type="number" min={24} step={0.01} max={selectedPlacement ? Math.floor((layout[axis === "x" ? "width" : "height"] - 24 - freePlacementSize(selectedBlock, selectedPlacement)[axis === "x" ? "width" : "height"]) * 100) / 100 : undefined} disabled={disabled || !ready || !selectedPlacement} value={selectedPlacement ? Number(selectedPlacement[axis].toFixed(2)) : ""} onChange={event => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value) || !selectedPlacement) return;
              applyPosition(selectedPlacement, { page: selectedPlacement.page, x: selectedPlacement.x, y: selectedPlacement.y, [axis]: value });
            }} /></label>)}
          </div>
          <Button type="button" size="sm" variant="outline" disabled={disabled || !ready || !selectedPlacement} onClick={() => { if (selectedPlacement) applyPosition(selectedPlacement, { page, x: selectedPlacement.x, y: selectedPlacement.y }); }}>{t("documentation.moveToPage")}</Button>
          {selectedBlock.position && <Button type="button" size="sm" variant="outline" onClick={() => { changeBlock(selected, { ...selectedBlock, position: undefined }); }}>{t("documentation.restoreFlow")}</Button>}
          <p className="text-xs text-subtle" aria-live="polite">{selectedPlacement && `${t("documentation.page")} ${selectedPlacement.page + 1} · X: ${selectedPlacement.x.toFixed(1)} · Y: ${selectedPlacement.y.toFixed(1)}`}</p>
        </>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled || selected === 0} onClick={() => { setEditing(null); onMove?.(selected, -1); setSelected(value => value - 1); }}>{t("documentation.moveUp")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled || selected >= blocks.length - 1} onClick={() => { setEditing(null); onMove?.(selected, 1); setSelected(value => value + 1); }}>{t("documentation.moveDown")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled || blocks.length <= 1} onClick={() => { setEditing(null); onRemove?.(selected); setSelected(Math.max(0, selected - 1)); }}>{t("documentation.remove")}</Button>
        </div>
        <p className="text-xs text-subtle">{t("documentation.positionReview")}</p>
      </aside>
      </div>
  </div>;
}
