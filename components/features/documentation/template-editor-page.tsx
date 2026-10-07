"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { DocumentationTemplate } from "@/lib/entity/documentation";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import { TemplateEditor } from "./template-editor";

export function TemplateEditorPage({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<{ id: string; template: DocumentationTemplate } | null>(null);
  const [failedId, setFailedId] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!templateId) return;
    let current = true;
    setLoaded(null);
    setFailedId(undefined);
    void documentationService.template(templateId).then(template => {
      if (current) setLoaded({ id: templateId, template });
    }).catch(() => {
      if (current) setFailedId(templateId);
    });
    return () => { current = false; };
  }, [templateId, attempt]);
  const backToList = () => router.push("/documentation");
  return <div className="min-h-full w-full min-w-0 text-ink">
    {templateId && loaded?.id !== templateId ? <section className="space-y-4 rounded-xl border border-hairline bg-elevated p-4">
      {failedId === templateId ? <>
        <p role="alert">{t("documentation.error")}</p>
        <Button onClick={() => { setFailedId(undefined); setAttempt(value => value + 1); }}>{t("documentation.refresh")}</Button>
      </> : <p role="status">{t("documentation.loading")}</p>}
      <Button variant="ghost" onClick={backToList}>{t("documentation.cancel")}</Button>
    </section> : <TemplateEditor key={templateId ?? "new"} template={templateId ? loaded?.template : undefined} onCancel={backToList} onSaved={backToList} />}
  </div>;
}
