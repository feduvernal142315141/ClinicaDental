"use client";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Input } from "@/components/ui";
import type { DocumentBlock, DocumentPosition, SignerRole, DocumentationTemplate } from "@/lib/entity/documentation";
import { templateSchema, validImportFile, type TemplateForm } from "@/lib/validation/documentation";
import { documentationService as service } from "@/lib/services/documentation/documentation.service";
import { useDocumentationAction } from "@/lib/hooks/use-documentation";
import { useI18n } from "@/lib/contexts/i18n-context";
import { DocumentUpload } from "./document-upload";
import { PdfPreview } from "./pdf-preview";
import { TemplateLayoutDesigner } from "./template-layout-designer";

export function TemplateEditor({ template, onSaved, onCancel }: { template?: DocumentationTemplate; onSaved: (template: DocumentationTemplate) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { busy, error, run } = useDocumentationAction();
  const form = useForm<TemplateForm>({ resolver: zodResolver(templateSchema), mode: "onBlur", defaultValues: {
    name: template?.name ?? "", blocks: template?.blocks ?? [{ type: "TEXT", text: "" }, { type: "SIGNATURE", alignment: "LEFT", width: 260 }],
  } });
  const { fields, insert, remove, move, replace } = useFieldArray({ control: form.control, name: "blocks" });
  const [sourceId, setSourceId] = useState(template?.sourceId);
  const [importRevision, setImportRevision] = useState(0);
  const [imported, setImported] = useState(false);
  const [reviewed, setReviewed] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileError, setFileError] = useState(false);
  const [preview, setPreview] = useState<Blob | null>(null);
  const watchedBlocks = form.watch("blocks");
  const add = (index: number, type: DocumentBlock["type"], page?: number, position?: DocumentPosition, signerRole?: SignerRole) => insert(index,
    type === "PAGE_BREAK" ? { type, page } : type === "TEXT" ? { type, text: "" } : { type, alignment: "LEFT", width: type === "LOGO" ? 120 : 260, ...(position ? { position } : {}), ...(signerRole ? { signerRole } : {}) });
  const submit = form.handleSubmit(values => run(async () => {
    if (!reviewed) return;
    const saved = await service.save({ ...values, sourceId }, template);
    onSaved(saved);
  }));
  return <section className="min-h-full w-full min-w-0 space-y-3 rounded-2xl border border-hairline bg-elevated p-4">
    <h1 className="text-xl font-semibold">{template ? t("documentation.editTemplate") : t("documentation.newTemplate")}</h1>
    <p className="text-sm text-subtle">{t("documentation.versionHint")}</p>
    <Form {...form}><form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid min-w-0 items-start gap-3 md:grid-cols-[minmax(0,360px)_minmax(0,480px)]">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem className="gap-1 space-y-0"><FormLabel className="block text-xs leading-4">{t("documentation.name")}</FormLabel><FormControl><Input {...field} className="h-10 rounded-lg py-2" maxLength={200} /></FormControl></FormItem>} />
        <DocumentUpload disabled={busy} onFiles={files => {
          const file = files[0];
          if (files.length !== 1 || !file || !validImportFile(file)) { setFileError(true); return; }
          setFileError(false);
          void run(async () => {
            const result = await service.importFile(file);
            replace([{ type: "TEXT", text: result.text }]);
            form.clearErrors("blocks"); setPreview(null);
            setImportRevision(value => value + 1);
            setSourceId(result.sourceId); setImported(true); setReviewed(false);
            setWarnings(result.warnings);
          });
        }} />
        </div>
        <p className="text-xs leading-relaxed text-subtle">{t("documentation.importHint")}</p>
        {fileError && <p role="alert" className="text-rose-500">{t("documentation.fileError")}</p>}
        {warnings.length > 0 && <ul className="list-disc pl-5 text-sm">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        <TemplateLayoutDesigner key={importRevision} onReplace={replace} input={{ name: form.watch("name"), blocks: watchedBlocks, sourceId }} disabled={busy}
          onChange={(index, block) => form.setValue(`blocks.${index}`, block, { shouldDirty: true })}
          onAdd={(type, page, position, signerRole) => add(fields.length, type, page, position, signerRole)} onRemove={remove} onMove={(index, delta) => move(index, index + delta)} />
        {imported && <label className="flex gap-2"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>{t("documentation.reviewed")}</span></label>}
        {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-rose-500">{t("documentation.validation")}</p>}
        {error && <p role="alert" className="text-rose-500">{error}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <Button type="submit" disabled={!reviewed} loading={busy}>{t("documentation.save")}</Button>
          <Button type="button" variant="outline" onClick={form.handleSubmit(values => run(async () => setPreview(await service.previewTemplate(values))))}>{t("documentation.preview")}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>{t("documentation.cancel")}</Button>
        </div>
      </fieldset>
    </form></Form>
    <PdfPreview blob={preview} title={t("documentation.preview")} onClose={() => setPreview(null)} />
  </section>;
}
