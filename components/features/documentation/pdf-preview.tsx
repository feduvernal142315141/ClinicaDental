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
    <DialogContent className="max-w-5xl">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{t("documentation.previewHint")}</DialogDescription></DialogHeader>
      {url && <><iframe title={title} src={url} className="h-[65vh] w-full rounded-xl border border-hairline bg-white" />
        <a className="text-brand underline" href={url} download="documento.pdf">{t("documentation.download")}</a></>}
      <Button variant="outline" onClick={onClose}>{t("documentation.close")}</Button>
    </DialogContent>
  </Dialog>;
}
