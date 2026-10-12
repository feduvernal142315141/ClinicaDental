"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/shadcn/dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useI18n } from "@/lib/contexts/i18n-context";
import type {
  MetaTemplateRepublishItem,
  MetaTemplateRepublishResult,
} from "@/lib/entity/settings";
import { republishReasonText } from "./template-status";

// ── Confirmación ──────────────────────────────────────────────────────────

export interface TemplateRepublishConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Antes de republicar: qué se envía a Meta y qué pasa mientras lo revisa. */
export function TemplateRepublishConfirm({ open, onConfirm, onCancel }: TemplateRepublishConfirmProps) {
  const { t } = useI18n();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent className="rounded-2xl border-hairline bg-surface shadow-bento">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-ink">
            {t("settings.notifications.republish.confirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-subtle">
              <p>{t("settings.notifications.republish.confirm.intro")}</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>{t("settings.notifications.republish.confirm.pending")}</li>
                <li>{t("settings.notifications.republish.confirm.notImmediate")}</li>
              </ul>
              <p>{t("settings.notifications.republish.confirm.notSync")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("settings.notifications.whatsapp.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("settings.notifications.republish.confirm.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Resultado ─────────────────────────────────────────────────────────────

export function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <dd className="text-lg font-semibold text-ink">{value}</dd>
      <dt className="text-xs text-subtle">{label}</dt>
    </div>
  );
}

/** Plantillas que quedaron fuera de una acción, cada una con su motivo ya traducido. */
export function ItemList({
  title,
  items,
  reasonText = republishReasonText,
}: {
  title: string;
  items: MetaTemplateRepublishItem[];
  reasonText?: typeof republishReasonText;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id || `${item.name}-${index}`} className="rounded-xl border border-hairline px-3 py-2">
            <p className="break-words text-sm font-medium text-ink">
              {item.name || t("settings.notifications.republish.result.unnamed")}
            </p>
            <p className="text-xs text-subtle">{reasonText(item.reason, t)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface TemplateRepublishResultProps {
  /** `null` = cerrado. */
  result: MetaTemplateRepublishResult | null;
  onClose: () => void;
}

/**
 * Qué pasó al republicar. No es todo o nada: en la misma respuesta puede haber
 * republicadas, omitidas y fallidas, y cada omitida o fallida dice qué hacer.
 */
export function TemplateRepublishResult({ result, onClose }: TemplateRepublishResultProps) {
  const { t } = useI18n();
  // El contenido se conserva mientras el diálogo se cierra.
  const [shown, setShown] = React.useState(result);
  React.useEffect(() => {
    if (result) setShown(result);
  }, [result]);
  const data = result ?? shown;

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-hairline bg-surface shadow-bento sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {t("settings.notifications.republish.result.title")}
          </DialogTitle>
          <DialogDescription className="text-subtle">
            {data && data.republished > 0
              ? t("settings.notifications.republish.result.pendingNote")
              : t("settings.notifications.republish.result.nothingSent")}
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2">
              <Count value={data.republished} label={t("settings.notifications.republish.result.republished")} />
              <Count value={data.alreadyInAccount} label={t("settings.notifications.republish.result.alreadyInAccount")} />
              <Count value={data.skipped.length} label={t("settings.notifications.republish.result.skipped")} />
              <Count value={data.failed.length} label={t("settings.notifications.republish.result.failed")} />
            </dl>
            <ItemList title={t("settings.notifications.republish.result.failedTitle")} items={data.failed} />
            <ItemList title={t("settings.notifications.republish.result.skippedTitle")} items={data.skipped} />
          </div>
        )}
        <DialogFooter>
          <Button type="button" size="sm" onClick={onClose}>
            {t("settings.notifications.republish.result.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
