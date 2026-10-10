"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/primitives/shadcn/tooltip";
import { Eye, FilePlus2, ListChecks, RotateCcw, Signature, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-display/data-table";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useDocumentationAction } from "@/lib/hooks/use-documentation";
import type { DocumentationTemplate, PatientDocument, VisitDocumentGroup, VisitDocuments } from "@/lib/entity/documentation";
import { documentObservationTitles } from "@/lib/entity/documentation/variables";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { servicesService } from "@/lib/services/services/services.service";
import { useOdontogramStore, type OdontogramSnapshot } from "@/lib/odontogram/store";
import { DocumentSigning } from "@/components/features/documentation/document-signing";
import { PdfPreview } from "@/components/features/documentation/pdf-preview";
import { ConsultationDocumentsContext } from "./consultation-documents-context";

type Props = {
  children: ReactNode;
  documentationView?: boolean;
  visitId: string;
  persist: (transform?: (snapshot: OdontogramSnapshot) => OdontogramSnapshot) => Promise<void>;
};
type DocumentRow = { id: string; title: string; services: string[]; toothCount: number; treatments: { eventId: string; serviceName: string; toothNumber: number }[]; template?: DocumentationTemplate; group?: VisitDocumentGroup };
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

/** One selection across all teeth, scoped to a concrete consultation UUID. */
export function ConsultationDocuments({ children, visitId, persist, documentationView = true }: Props) {
  const { t } = useI18n();
  const readOnly = useOdontogramStore(state => state.readOnly);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const events = useOdontogramStore(state => state.clinicalEvents);
  const { busy, error, run } = useDocumentationAction();
  const [bundle, setBundle] = useState<VisitDocuments | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [templates, setTemplates] = useState<DocumentationTemplate[] | null>(null);
  const [serviceTemplates, setServiceTemplates] = useState<Record<string, string>>({});
  const [treatmentsTarget, setTreatmentsTarget] = useState<string | null>(null);
  const [restartTarget, setRestartTarget] = useState<VisitDocumentGroup | null>(null);
  const [observations, setObservations] = useState<Record<string, Record<string, string>>>({});
  const [signing, setSigning] = useState<{ document: PatientDocument; pdf: Blob } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [fieldStep, setFieldStep] = useState(0);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const inspectedKey = useRef("");
  const reconciliationKey = useRef("");
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);
  const selectionRef = useRef(selected);
  selectionRef.current = selected;
  const refresh = useCallback(async () => {
    const next = await service.visitDocuments(visitId);
    if (!mounted.current) return;
    inspectedKey.current = "";
    setBundle(next);
    setSelected(next.eventIds);
    setTemplates(null);
    if (!readOnlyRef.current) {
      const statuses = await Promise.all(next.groups.filter(group => group.document.status !== "SIGNED").map(async group => ({ group, status: await service.signatureRequestStatus(group.document.id) })));
      if (!mounted.current) return;
      const pendingGroup = statuses.find(({ status }) => status.status === "SENT" || status.status === "LINK_READY")?.group;
      if (pendingGroup) {
        setWaiting(true);
        setActiveTemplateId(pendingGroup.templateId);
        setSigning({ document: pendingGroup.document, pdf: new Blob() });
      }
    }
    setLoaded(true);
  }, [visitId]);
  useEffect(() => {
    mounted.current = true;
    void run(refresh);
    return () => { mounted.current = false; };
  }, [refresh, run]);
  const selectedEvents = useMemo(() => events.filter(event => selected.includes(event.id)), [events, selected]);
  const liveIds = useMemo(() => new Set(events.filter(event => event.type === "plan" && event.status !== "canceled").map(event => event.id)), [events]);
  const removedIds = selected.filter(id => !liveIds.has(id));
  const invalidGroups = bundle?.groups.filter(group => group.treatments.some(item => !liveIds.has(item.eventId))) ?? [];
  const needsReconciliation = removedIds.length > 0 || invalidGroups.length > 0;
  const removalKey = JSON.stringify([removedIds, invalidGroups.map(group => group.document.id)]);
  useEffect(() => {
    if (!loaded || readOnly || busy || !needsReconciliation || reconciliationKey.current === removalKey) return;
    reconciliationKey.current = removalKey;
    setSelected(previous => previous.filter(id => liveIds.has(id)));
    setTemplates(null); setActiveTemplateId(null); setSigning(null); setPreview(null);
    inspectedKey.current = "";
    void run(async () => {
      // Saving atomically invalidates PDFs for removed treatments before refreshing their metadata.
      await persist();
      const next = await service.visitDocuments(visitId);
      if (mounted.current) setBundle(next);
    });
  }, [loaded, readOnly, busy, needsReconciliation, removalKey, liveIds, persist, visitId, run]);
  const coverageChanged = bundle?.groups.some(group => group.treatments.some(item => {
    const event = events.find(value => value.id === item.eventId);
    return !event || (event.serviceId ?? event.procedureId) !== item.serviceId || event.toothNumber !== item.toothNumber || !sameIds(event.surfaces, item.surfaces);
  })) ?? false;
  const selectionChanged = !!bundle && (!sameIds(selected, bundle.eventIds) || coverageChanged);
  const signaturesMissing = bundle?.groups.some(group => group.signatureRequired && group.document.status !== "SIGNED") ?? true;
  const invalidSelection = selectedEvents.length !== selected.length || selectedEvents.some(event => event.status === "canceled" || event.type !== "plan");
  const saveSelection = useCallback(async (ids: string[]): Promise<boolean> => {
    if (readOnly || busy || !loaded || signing || !bundle) return false;
    let saved = false;
    await run(async () => {
      await persist();
      const next = await service.prepareVisitDocuments(visitId, {
        eventIds: ids, expectedSelectionHash: bundle.selectionHash, draftOnly: true,
      });
      if (!mounted.current) return;
      inspectedKey.current = "";
      setBundle(next); setSelected(next.eventIds); setTemplates(null); setActiveTemplateId(null);
      saved = true;
    });
    return saved;
  }, [readOnly, busy, loaded, signing, bundle, run, persist, visitId]);
  const stage = useCallback(async (ids: string[]): Promise<boolean> => {
    const next = [...new Set([...selectionRef.current, ...ids])];
    if (!sameIds(next, selectionRef.current)) return saveSelection(next);
    return true;
  }, [saveSelection]);
  const inspectSelection = useCallback(async (currentBundle = bundle) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = [...new Set(selectedEvents.map(event => event.serviceId ?? (event.procedureId && uuid.test(event.procedureId) ? event.procedureId : undefined)).filter((id): id is string => !!id))];
    const configs = await Promise.all(ids.map(id => servicesService.getServiceById(id)));
    const templateIds = [...new Set(configs.map(config => config.documentationTemplateId).filter((id): id is string => !!id))];
    const loadedTemplates = await Promise.all(templateIds.map(id => service.template(id)));
    setServiceTemplates(Object.fromEntries(configs.flatMap((config, index) => config.documentationTemplateId ? [[ids[index], config.documentationTemplateId]] : [])));
    const missingTemplates = loadedTemplates.filter(template => {
      const old = currentBundle?.groups.find(group => group.templateId === template.id);
      if (!old) return true;
      const matching = selectedEvents.filter(event => configs.some((config, index) => config.documentationTemplateId === template.id && ids[index] === (event.serviceId ?? event.procedureId)));
      return old.treatments.length !== matching.length || old.treatments.some(item => !matching.some(event => event.id === item.eventId && (event.serviceId ?? event.procedureId) === item.serviceId && event.toothNumber === item.toothNumber && sameIds(event.surfaces, item.surfaces)));
    });
    setTemplates(missingTemplates);
    setActiveTemplateId(null);
    return missingTemplates;
  }, [selectedEvents, bundle]);
  const inspectionKey = JSON.stringify([bundle?.selectionHash, selectedEvents.map(event => [event.id, event.serviceId, event.procedureId, event.toothNumber, event.surfaces])]);
  useEffect(() => {
    if (signing || !documentationView || !loaded || readOnly || busy || needsReconciliation || inspectedKey.current === inspectionKey) return;
    inspectedKey.current = inspectionKey;
    void run(async () => { await inspectSelection(); });
  }, [signing, documentationView, loaded, readOnly, busy, needsReconciliation, inspectionKey, inspectSelection, run]);
  const draft = templates?.find(template => template.id === activeTemplateId);
  const fieldTitles = draft ? documentObservationTitles(draft.blocks) : [];
  const currentField = fieldTitles[fieldStep];
  const currentFieldValid = !currentField || !!observations[draft!.id]?.[currentField]?.trim();
  const activeGroup = bundle?.groups.find(group => group.templateId === activeTemplateId);
  const draftComplete = (template: DocumentationTemplate) => documentObservationTitles(template.blocks).every(title => !!observations[template.id]?.[title]?.trim());
  const validObservations = !!draft && fieldTitles.every(title => { const value = observations[draft.id]?.[title]?.trim(); return !!value && value.length <= 5000; });
  const generate = async () => {
    if (!draft) return;
    await persist();
    const applicableObservations = Object.fromEntries(Object.entries(observations).filter(([id]) => id === draft.id));
    const next = await service.prepareVisitDocuments(visitId, { eventIds: selected, expectedSelectionHash: bundle!.selectionHash, templateIds: [draft.id], observations: applicableObservations });
    setBundle(next); setSelected(next.eventIds); setTemplates(null);
    const generatedGroup = next.groups.find(group => group.templateId === draft.id && group.document.status !== "SIGNED");
    if (generatedGroup) {
      setActiveTemplateId(generatedGroup.templateId);
      setSigning({ document: generatedGroup.document, pdf: new Blob() });
    }
  };
  const restart = async () => {
    if (!restartTarget || !bundle || readOnly || signing) return;
    const templateId = restartTarget.templateId;
    const next = await service.restartVisitDocument(visitId, restartTarget.document.id, bundle.selectionHash);
    setBundle(next); setSelected(next.eventIds); setTemplates(null); setSigning(null); setPreview(null);
    setRestartTarget(null); setActiveTemplateId(null);
    setObservations(previous => { const updated = { ...previous }; delete updated[templateId]; return updated; });
    const drafts = await inspectSelection(next);
    inspectedKey.current = JSON.stringify([next.selectionHash, selectedEvents.map(event => [event.id, event.serviceId, event.procedureId, event.toothNumber, event.surfaces])]);
    if (drafts.some(template => template.id === templateId)) { setFieldStep(0); setActiveTemplateId(templateId); }
  };
  const rows: DocumentRow[] = [
    ...(templates ?? []).map(template => {
      const treatments = selectedEvents.filter(event => serviceTemplates[event.serviceId ?? event.procedureId ?? ""] === template.id);
      return { id: template.id, title: template.name, template, treatments: treatments.map(event => ({ eventId: event.id, serviceName: event.serviceName ?? event.procedureName ?? t("consultationDocuments.unavailable"), toothNumber: event.toothNumber })), services: [...new Set(treatments.map(event => event.serviceName ?? event.procedureName ?? t("consultationDocuments.unavailable")))], toothCount: new Set(treatments.map(event => event.toothNumber).filter(Boolean)).size };
    }),
    ...(bundle?.groups ?? []).filter(group => (readOnly || !invalidGroups.includes(group)) && !templates?.some(template => template.id === group.templateId)).map(group => ({ id: group.templateId, title: group.document.title, group, treatments: group.treatments, services: [...new Set(group.treatments.map(item => item.serviceName))], toothCount: new Set(group.treatments.map(item => item.toothNumber).filter(Boolean)).size })),
  ];
  const treatmentRow = rows.find(row => row.id === treatmentsTarget);
  const columns: DataTableColumn<DocumentRow>[] = [
    { key: "title", title: t("consultationDocuments.documentColumn"), render: (_, row) => <div className="min-w-40"><span className="font-medium">{row.title}</span><p className="text-sm text-subtle">{row.template ? t(draftComplete(row.template) ? "consultationDocuments.detailsComplete" : "consultationDocuments.needsDetails") : `${t(row.group?.signatureRequired ? "consultationDocuments.required" : "consultationDocuments.optional")} · ${t(row.group?.document.status === "SIGNED" ? "consultationDocuments.signed" : "consultationDocuments.pending")}`}</p></div> },
    { key: "services", title: t("consultationDocuments.servicesColumn"), render: (_, row) => <span>{row.services.join(", ") || "—"}</span> },
    { key: "toothCount", title: t("consultationDocuments.teethColumn"), dataIndex: "toothCount", align: "center" },
    { key: "actions", title: t("consultationDocuments.actionsColumn"), render: (_, row) => <div className="flex items-center gap-1">
      <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" aria-label={t("consultationDocuments.viewTreatments")} onClick={() => setTreatmentsTarget(row.id)}><ListChecks className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t("consultationDocuments.viewTreatments")}</TooltipContent></Tooltip>
      {row.template && !readOnly && <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" disabled={busy || !!signing} aria-label={`${t("consultationDocuments.generateDocument")}: ${row.title}`} onClick={() => { setFieldStep(0); setActiveTemplateId(row.id); }}><FilePlus2 className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t("consultationDocuments.generateDocument")}</TooltipContent></Tooltip>}
      {row.group && <>
        {(readOnly || row.group.document.status === "SIGNED") && <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" aria-label={t(row.group.document.status === "SIGNED" ? "consultationDocuments.viewSigned" : "documentation.readDocument")} disabled={busy || !!signing} onClick={() => void run(async () => setPreview(await service.pdf(row.group!.document.id)))}><Eye className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t(row.group.document.status === "SIGNED" ? "consultationDocuments.viewSigned" : "documentation.readDocument")}</TooltipContent></Tooltip>}
        {!readOnly && row.group.document.status !== "SIGNED" && <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" aria-label={t("consultationDocuments.sign")} disabled={busy || !!signing || selectionChanged} onClick={() => { setActiveTemplateId(row.id); setSigning({ document: row.group!.document, pdf: new Blob() }); }}><Signature className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t("consultationDocuments.sign")}</TooltipContent></Tooltip>}
        {!readOnly && !row.group.treatments.some(item => events.some(event => event.id === item.eventId && event.status === "done")) && <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" aria-label={t("consultationDocuments.restart")} disabled={busy || !!signing || selectionChanged} onClick={() => setRestartTarget(row.group!)}><RotateCcw className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t("consultationDocuments.restart")}</TooltipContent></Tooltip>}
      </>}
    </div> },
  ];
  return <ConsultationDocumentsContext.Provider value={{ stage, busy: busy || !loaded || !!signing }}>
    <section hidden={!documentationView} className={documentationView ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-4" : "hidden"} aria-label={t("consultationDocuments.title")}>
      <header><h2 className="text-lg font-semibold">{t("consultationDocuments.title")}</h2><p className="text-sm text-subtle">{t("consultationDocuments.listHint")}</p></header>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {!loaded && <Button variant="outline" disabled={busy} onClick={() => void run(refresh)}>{busy ? t("consultationDocuments.loading") : t("consultationDocuments.retry")}</Button>}
      {loaded && <>
        <div className="space-y-4">
          <DataTable columns={columns} data={rows} rowKey="id" loading={busy} showPagination={false} emptyText={t("consultationDocuments.empty")} />
          <Dialog open={!!treatmentRow} onOpenChange={open => { if (!open) setTreatmentsTarget(null); }}>
            <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
              <DialogHeader><DialogTitle>{t("consultationDocuments.viewTreatments")}</DialogTitle><DialogDescription>{treatmentRow?.title}</DialogDescription></DialogHeader>
              <ul className="min-h-0 space-y-2 overflow-y-auto">{treatmentRow?.treatments.map(item => <li key={item.eventId} className="flex items-center justify-between gap-3 rounded-lg border border-hairline p-3 text-sm">
                <span>{item.serviceName} · {t("consultationDocuments.tooth")} {item.toothNumber}</span>
                {!readOnly && events.some(event => event.id === item.eventId && event.status !== "done") && <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="icon" aria-label={`${t("consultationDocuments.remove")}: ${item.serviceName} · ${item.toothNumber}`} disabled={busy || !!signing} onClick={() => void saveSelection(selected.filter(id => id !== item.eventId))}><X className="h-4 w-4" aria-hidden="true" /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>{t("consultationDocuments.remove")}</TooltipContent></Tooltip>}
              </li>)}</ul>
            </DialogContent>
          </Dialog>
          <Dialog open={!!restartTarget} onOpenChange={open => { if (!open && !busy) setRestartTarget(null); }}>
            <DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
              <DialogHeader><DialogTitle>{t("consultationDocuments.restart")}</DialogTitle><DialogDescription>{t("consultationDocuments.restartWarning")}</DialogDescription></DialogHeader>
              <p className="font-medium">{restartTarget?.document.title}</p>
              {error && <p role="alert" className="text-destructive">{error}</p>}
              <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setRestartTarget(null)}>{t("consultationDocuments.cancelRestart")}</Button><Button disabled={busy} onClick={() => void run(restart)}>{t("consultationDocuments.confirmRestart")}</Button></div>
            </DialogContent>
          </Dialog>
          <Dialog open={(documentationView || !!signing) && !!activeTemplateId} onOpenChange={open => { if (!open && !busy && !waiting) { setActiveTemplateId(null); setSigning(null); } }}>
            <DialogContent showCloseButton={!waiting} className={waiting ? "fixed inset-0 z-[2147483646] flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col justify-center overflow-y-auto rounded-none border-0 bg-background p-6 sm:max-w-none sm:p-12" : `flex max-h-[94dvh] w-[calc(100%-2rem)] flex-col overflow-hidden ${signing ? "sm:max-w-[94vw]" : "sm:max-w-3xl"}`} onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy || waiting) event.preventDefault(); }}>
              <DialogHeader className="shrink-0"><DialogTitle>{draft?.name ?? activeGroup?.document.title ?? t("consultationDocuments.tab")}</DialogTitle><DialogDescription className={signing ? "sr-only" : undefined}>{signing ? t("documentation.clickSignatureHint") : draft ? t("consultationDocuments.wizardHint") : activeGroup?.treatments.map(item => `${item.serviceName} (${t("consultationDocuments.tooth")} ${item.toothNumber})`).join(", ")}</DialogDescription></DialogHeader>
              {error && <p role="alert" className="text-destructive">{error}</p>}
              {draft && <>
                <div className="shrink-0 space-y-2">
                  <p className="text-sm text-subtle" aria-live="polite">{t("consultationDocuments.step")} {Math.min(fieldStep + 1, fieldTitles.length + 1)} / {fieldTitles.length + 1} · {currentField ?? t("consultationDocuments.reviewData")}</p>
                  <div role="progressbar" aria-label={t("consultationDocuments.step")} aria-valuemin={1} aria-valuemax={fieldTitles.length + 1} aria-valuenow={Math.min(fieldStep + 1, fieldTitles.length + 1)} className="h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full bg-brand transition-all" style={{ width: `${(fieldStep + 1) / (fieldTitles.length + 1) * 100}%` }} /></div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
                  {currentField ? <label key={`${draft.id}:${currentField}`} className="block space-y-3"><span className="text-lg font-medium">{currentField}</span><textarea autoFocus className="min-h-40 w-full rounded-lg border border-hairline bg-canvas p-3" maxLength={5000} required disabled={busy} value={observations[draft.id]?.[currentField] ?? ""} onChange={event => setObservations(previous => ({ ...previous, [draft.id]: { ...previous[draft.id], [currentField]: event.target.value } }))} /></label> : <div className="space-y-4"><h3 className="font-semibold">{t("consultationDocuments.reviewData")}</h3>{fieldTitles.map((title,index) => <div key={title} className="rounded-lg border border-hairline p-3"><div className="flex items-center justify-between gap-2"><h4 className="font-medium">{title}</h4><Button variant="ghost" disabled={busy} onClick={() => setFieldStep(index)}>{t("consultationDocuments.editField")}</Button></div><p className="whitespace-pre-wrap break-words text-sm text-subtle">{observations[draft.id]?.[title]}</p></div>)}{!validObservations && <p className="text-sm text-subtle">{t("consultationDocuments.rowDetailsHint")}</p>}</div>}
                </div>
                <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-hairline pt-4">
                  <Button variant="outline" disabled={busy || fieldStep === 0} onClick={() => setFieldStep(step => step - 1)}>{t("consultationDocuments.previous")}</Button>
                  {currentField ? <Button disabled={busy || !currentFieldValid} onClick={() => setFieldStep(step => step + 1)}>{t("consultationDocuments.next")}</Button> : <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setActiveTemplateId(null)}>{t("consultationDocuments.saveDetails")}</Button>{validObservations && <Button disabled={busy || invalidSelection} onClick={() => void run(generate)}>{t("consultationDocuments.generate")}</Button>}</div>}
                </div>
              </>}
              <div className="min-h-0 overflow-y-auto overscroll-contain space-y-4">
            {signing && <DocumentSigning onWaitingChange={setWaiting} embedded key={signing.document.id} document={signing.document} initialPdf={signing.pdf} onClose={() => { setSigning(null); setActiveTemplateId(null); }} onSigned={document => {
              setWaiting(false); setSigning(null); setActiveTemplateId(null); setBundle(current => current && ({ ...current, groups: current.groups.map(group => group.document.id === document.id ? { ...group, document } : group) })); void run(refresh);
            }} />}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {!readOnly && (invalidSelection || !!templates?.length || (!!bundle?.groups.length && (selectionChanged || signaturesMissing))) && <footer className="sticky bottom-0 z-10 shrink-0 space-y-2 rounded-xl border border-hairline bg-elevated p-4">
          {invalidSelection && <p role="alert" className="text-destructive">{t("consultationDocuments.invalid")}</p>}
          {!!templates?.length && <p className="text-sm text-subtle">{t("consultationDocuments.rowDetailsHint")}</p>}
          {selectionChanged && !!bundle?.groups.length && <p className="text-sm text-subtle">{t("consultationDocuments.replacement")}</p>}
          {signaturesMissing && !!bundle?.groups.length && <p className="text-sm text-subtle">{t("consultationDocuments.blocked")}</p>}
        </footer>}
      </>}
      <PdfPreview blob={preview} title={t("documentation.preview")} onClose={() => setPreview(null)} />
    </section>
    <div hidden={documentationView} className={documentationView ? "hidden" : "flex min-h-0 flex-1 flex-col"}>{children}</div>
  </ConsultationDocumentsContext.Provider>;
}
