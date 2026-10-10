"use client";
import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui";
import { useI18n } from "@/lib/contexts/i18n-context";

export function PdfPreview({ blob, title, onClose }: { blob: Blob | null; title: string; onClose: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) { setUrl(""); return; }
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return <Dialog open={!!blob} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[96dvh] w-[96vw] max-w-[96vw] flex-col gap-3 overflow-hidden p-3 sm:max-w-[96vw] sm:p-4">
      <DialogHeader className="shrink-0 pr-8"><DialogTitle>{title}</DialogTitle><DialogDescription>{t("documentation.previewHint")}</DialogDescription></DialogHeader>
      {url && <iframe title={title} src={`${url}#zoom=100`} className="min-h-0 w-full flex-1 rounded-lg border border-hairline bg-white" />}
      <div className="flex shrink-0 items-center justify-between gap-3">
        {url && <a className="text-brand underline" href={url} download="documento.pdf">{t("documentation.download")}</a>}
        <Button variant="outline" onClick={onClose}>{t("documentation.close")}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
