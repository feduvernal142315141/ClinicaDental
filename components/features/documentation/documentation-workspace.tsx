"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Plus, Pencil } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/data-display/data-table";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useDocumentationAction } from "@/lib/hooks/use-documentation";
import type { DocumentationDoctorOption, DocumentationTemplate, PatientDocument } from "@/lib/entity/documentation";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { DocumentSigning } from "./document-signing";
import { PdfPreview } from "./pdf-preview";

import { needsDoctorVariables, needsSelectedDocumentDate } from "@/lib/entity/documentation/variables";

type PatientOption = { id: string; name: string };
const PAGE_SIZE = 25;

export function DocumentationWorkspace() {
  const { t } = useI18n();
  const router = useRouter();
  const { busy: actionBusy, error, run } = useDocumentationAction();
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = actionBusy || listLoading;
  const [tab, setTab] = useState<"templates" | "documents">("templates");
  const [templates, setTemplates] = useState<DocumentationTemplate[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [offset, setOffset] = useState(0);
  const [templatePageSize, setTemplatePageSize] = useState(10);
  const [templatesHaveNext, setTemplatesHaveNext] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [prepareTemplate, setPrepareTemplate] = useState<DocumentationTemplate | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctors, setDoctors] = useState<DocumentationDoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [doctorsSearched, setDoctorsSearched] = useState(false);
  const requiresDoctor = prepareTemplate ? needsDoctorVariables(prepareTemplate.blocks) : false;
  const requiresDate = prepareTemplate ? needsSelectedDocumentDate(prepareTemplate.blocks) : false;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(documentDate);
  const [signing, setSigning] = useState<{ document: PatientDocument; pdf: Blob } | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let current = true;
    setLoaded(false); setListLoading(true); setListError("");
    const load = async () => {
      try {
        if (tab === "templates") {
          const result = await service.templates(offset, templatePageSize + 1);
          if (current) { setTemplates(result.slice(0, templatePageSize)); setTemplatesHaveNext(result.length > templatePageSize); }
        } else {
          const result = await service.documents(offset, PAGE_SIZE);
          if (current) setDocuments(result);
        }
        if (current) setLoaded(true);
      } catch {
        if (current) setListError(t("documentation.error"));
      } finally {
        if (current) setListLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [tab, offset, templatePageSize, revision, t]);
  const openDocument = async (id: string) => {
    const [document, pdf] = await Promise.all([service.document(id), service.pdf(id)]);
    if (document.status === "PENDING") setSigning({ document, pdf });
    else setPreview(pdf);
  };
  const count = tab === "templates" ? templates.length : documents.length;
  if (signing) return <div className="mx-auto max-w-5xl p-4 sm:p-6"><DocumentSigning key={signing.document.id} document={signing.document} initialPdf={signing.pdf} onClose={() => { setSigning(null); void reload(); }} onSigned={document => {
    setSigning(null); setDocuments(previous => previous.map(d => d.id === document.id ? document : d)); reload();
    void run(async () => { setPreview(await service.pdf(document.id)); });
  }} /></div>;
  return <main className="w-full space-y-6 p-4 text-ink sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><FileSignature />{t("documentation.title")}</h1><p className="mt-2 text-sm text-subtle">{t("documentation.description")}</p></div>
      <Button type="button" disabled={busy} onClick={() => router.push("/documentation/templates/new")}><Plus size={18} />{t("documentation.newTemplate")}</Button>
    </header>
    <nav aria-label={t("documentation.title")} className="flex flex-wrap gap-2">
      {(["templates", "documents"] as const).map(value => <Button type="button" key={value} disabled={busy} aria-pressed={tab === value} variant={tab === value ? "default" : "outline"} onClick={() => { setTab(value); setOffset(0); setPrepareTemplate(null); }}>{t(`documentation.${value}`)}</Button>)}
      <Button type="button" disabled={busy} variant="ghost" onClick={() => void reload()}>{t("documentation.refresh")}</Button>
    </nav>
    {(error || listError) && <p role="alert" className="rounded-xl border border-rose-500 p-4">{error || listError}</p>}
    {busy && <p role="status">{t("documentation.loading")}</p>}
    {prepareTemplate && <section className="space-y-4 rounded-2xl border border-hairline bg-elevated p-4">
      <h2 className="text-lg font-semibold">{t("documentation.prepare")}: {prepareTemplate.name} · {t("documentation.version")} {prepareTemplate.version}</h2>
      <form onSubmit={event => { event.preventDefault(); void run(async () => { setPatients(await service.patients(query.trim())); setSearched(true); }); }} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1"><span>{t("documentation.patientSearch")}</span><Input value={query} minLength={2} maxLength={100} disabled={busy} onChange={e => { setQuery(e.target.value); setPatientId(""); setPatients([]); setSearched(false); }} /></label>
        <Button type="submit" disabled={busy || query.trim().length < 2}>{t("documentation.search")}</Button>
      </form>
      {searched && patients.length === 0 && <p>{t("documentation.noPatients")}</p>}
      {patients.length > 0 && <label className="block space-y-1"><span>{t("documentation.patient")}</span><select className="block w-full rounded-xl border border-hairline bg-elevated p-3" value={patientId} disabled={busy} onChange={e => setPatientId(e.target.value)}>
        <option value="">{t("documentation.selectPatient")}</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
      </select></label>}
      {requiresDoctor && <div className="space-y-3">
        <form onSubmit={event => { event.preventDefault(); void run(async () => { setDoctors(await service.doctors(doctorQuery.trim())); setDoctorsSearched(true); }); }} className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1"><span>{t("documentation.doctorSearch")}</span><Input value={doctorQuery} minLength={2} maxLength={100} disabled={busy} onChange={event => { setDoctorQuery(event.target.value); setDoctorId(""); setDoctors([]); setDoctorsSearched(false); }} /></label>
          <Button type="submit" disabled={busy || doctorQuery.trim().length < 2}>{t("documentation.search")}</Button>
        </form>
        {doctorsSearched && doctors.length === 0 && <p>{t("documentation.noDoctors")}</p>}
        {doctors.length > 0 && <label className="block space-y-1"><span>{t("documentation.doctor")}</span><select className="block w-full rounded-xl border border-hairline bg-elevated p-3" value={doctorId} disabled={busy} onChange={event => setDoctorId(event.target.value)}>
          <option value="">{t("documentation.selectDoctor")}</option>{doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select></label>}
      </div>}
      {requiresDate && <label className="block max-w-xs space-y-1"><span>{t("documentation.documentDate")}</span><Input type="date" required aria-label={t("documentation.documentDate")} value={documentDate} disabled={busy} onChange={event => setDocumentDate(event.target.value)} /></label>}
      <div className="flex gap-2"><Button type="button" disabled={busy || !patientId || (requiresDoctor && !doctorId) || (requiresDate && !validDate)} onClick={() => void run(async () => {
        const document = requiresDate
          ? await service.prepare(prepareTemplate, patientId, requiresDoctor ? doctorId : undefined, documentDate)
          : await service.prepare(prepareTemplate, patientId, requiresDoctor ? doctorId : undefined);
        // Retain the created record even if fetching its preview fails.
        setPrepareTemplate(null); setTab("documents"); setOffset(0); setDocuments(previous => [document, ...previous]);
        await openDocument(document.id);
      })}>{t("documentation.prepare")}</Button><Button type="button" disabled={busy} variant="ghost" onClick={() => setPrepareTemplate(null)}>{t("documentation.cancel")}</Button></div>
    </section>}
    {tab === "templates" ? <section className="bento space-y-4 p-4 lg:p-5"><DataTable<DocumentationTemplate>
      columns={[
        { key: "name", title: t("documentation.name"), dataIndex: "name", render: (_, template) => <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline bg-hover text-subtle"><FileSignature className="h-4 w-4" /></div><span className="text-sm font-semibold text-ink">{template.name}</span></div> },
        { key: "version", title: t("documentation.version"), dataIndex: "version", width: 100 },
        { key: "actions", title: t("documentation.actions"), align: "center", width: 100, render: (_, template) => <div className="flex items-center justify-center gap-1">
          <button type="button" disabled={busy} title={t("documentation.edit")} aria-label={t("documentation.edit")} className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink disabled:opacity-40" onClick={() => router.push(`/documentation/templates/${encodeURIComponent(template.id)}/edit`)}><Pencil className="h-4 w-4" /></button>
          <button type="button" disabled={busy} title={t("documentation.prepare")} aria-label={t("documentation.prepare")} className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-brand disabled:opacity-40" onClick={() => { setPrepareTemplate(template); setDocumentDate(""); setQuery(""); setPatients([]); setPatientId(""); setSearched(false); setDoctorQuery(""); setDoctors([]); setDoctorId(""); setDoctorsSearched(false); }}><FileSignature className="h-4 w-4" /></button>
        </div> },
      ] satisfies DataTableColumn<DocumentationTemplate>[]}
      data={templates}
      loading={listLoading}
      rowKey="id"
      page={Math.floor(offset / templatePageSize) + 1}
      pageSize={templatePageSize}
      hasNextPage={templatesHaveNext}
      paginationDisabled={busy || !loaded}
      showSizeChanger
      pageSizeOptions={[10, 20, 50]}
      onPageChange={(page, size) => { setTemplatePageSize(size); setOffset((page - 1) * size); }}
      emptyText={listError ? t("documentation.error") : t("documentation.empty")}
    /></section> : loaded && <div className="space-y-3">{count === 0 && <p className="rounded-2xl border border-dashed border-hairline p-10 text-center text-subtle">{t("documentation.empty")}</p>}{documents.map(document => <article key={document.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-elevated p-4">
      <div><h2 className="font-semibold">{document.title}</h2><p className="text-sm">{document.patientName}</p><p className="text-sm text-subtle">{t(`documentation.${document.status}`)} · {t("documentation.version")} {document.templateVersion}</p></div>
      <Button type="button" disabled={busy} variant="outline" onClick={() => void run(() => openDocument(document.id))}>{t(document.status === "PENDING" ? "documentation.sign" : "documentation.viewPdf")}</Button>
    </article>)}</div>}
    {tab === "documents" && <div className="flex items-center justify-between gap-4"><Button type="button" variant="outline" disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>{t("documentation.previous")}</Button>
      <span>{Math.floor(offset / PAGE_SIZE) + 1}</span><Button type="button" variant="outline" disabled={busy || !loaded || count < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>{t("documentation.next")}</Button></div>}
    <PdfPreview blob={preview} title={t("documentation.preview")} onClose={() => setPreview(null)} />
  </main>;
}
