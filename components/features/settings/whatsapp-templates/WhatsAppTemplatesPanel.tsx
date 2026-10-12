"use client";

import * as React from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  MessageSquare,
  ArrowLeft,
  X,
  UploadCloud,
  AlertTriangle,
  CheckSquare,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import { TemplatePhonePreview } from "./TemplatePhonePreview";
import { TemplateRepublishConfirm } from "./TemplateRepublishDialogs";
import { TemplateDeleteConfirm } from "./TemplateDeleteDialogs";
import { getTemplateStatusConfig } from "./template-status";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  TEMPLATE_DELETE_MAX,
  isTemplateBeyondUse,
  type ClinicTemplate,
} from "@/lib/entity/settings";

// ── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "APPROVED" | "PENDING" | "REJECTED" | "NOT_IN_ACCOUNT";
type PanelView = "detail" | "create";

export interface WhatsAppTemplatesPanelProps {
  templates: ClinicTemplate[];
  loading: boolean;
  /** Sync Meta templates */
  onSync: () => void;
  isSyncing: boolean;
  /**
   * Republicar en la cuenta actual de Meta las plantillas escritas en el panel.
   * Se llama DESPUÉS de que el usuario confirma.
   */
  onRepublish?: () => void;
  isRepublishing?: boolean;
  /** Puede sincronizar/republicar (permiso `template` crear + editar). */
  canSync?: boolean;
  /**
   * Eliminar plantillas, DESPUÉS de que el usuario confirma. Devuelve los ids
   * que salieron de verdad: las bloqueadas o fallidas siguen seleccionadas para
   * reintentar. Solo se pasa a quien tiene el permiso `template` eliminar.
   */
  onDelete?: (ids: string[]) => Promise<string[]>;
  isDeleting?: boolean;
  /** Create new template */
  onCreate: (data: {
    name: string;
    body: string;
    category: "MARKETING" | "UTILITY";
    variables: Array<{ id: string; placeholder: string; sampleContent: string }>;
  }) => Promise<void>;
  savingTemplate: boolean;
}

// ── Status helpers ────────────────────────────────────────────────────────

const STATUS_FILTERS: StatusFilter[] = ["all", "APPROVED", "PENDING", "REJECTED", "NOT_IN_ACCOUNT"];
const STATUS_FILTER_LABEL_KEYS: Record<StatusFilter, TranslationKey> = {
  all: "settings.notifications.templates.filter.all",
  APPROVED: "settings.notifications.templates.filter.APPROVED",
  PENDING: "settings.notifications.templates.filter.PENDING",
  REJECTED: "settings.notifications.templates.filter.REJECTED",
  NOT_IN_ACCOUNT: "settings.notifications.templates.filter.NOT_IN_ACCOUNT",
};

function getStatusConfig(status: string | undefined, t: ReturnType<typeof useI18n>["t"]) {
  return (
    getTemplateStatusConfig(status, t) ?? {
      label: t("settings.notifications.templates.status.none"),
      className: "bg-hover text-subtle",
      hint: undefined,
    }
  );
}

function getCategoryLabel(cat: string | undefined, t: ReturnType<typeof useI18n>["t"]): string {
  switch (cat) {
    case "MARKETING": return "Marketing";
    case "UTILITY": return t("settings.notifications.templates.category.utility");
    case "AUTHENTICATION": return t("settings.notifications.templates.category.authentication");
    default: return cat ?? "";
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export function WhatsAppTemplatesPanel({
  templates,
  loading,
  onSync,
  isSyncing,
  onRepublish,
  isRepublishing = false,
  canSync = true,
  onDelete,
  isDeleting = false,
  onCreate,
  savingTemplate,
}: WhatsAppTemplatesPanelProps) {
  const { language, t } = useI18n();
  // ── State ─────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [panelView, setPanelView] = React.useState<PanelView>("detail");
  const [confirmingRepublish, setConfirmingRepublish] = React.useState(false);
  const canRepublish = canSync && !!onRepublish;

  // ── Eliminar: selección múltiple y lo que espera confirmación ─────
  const [selecting, setSelecting] = React.useState(false);
  const [checkedIds, setCheckedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = React.useState<ClinicTemplate[]>([]);
  const limitReached = checkedIds.size >= TEMPLATE_DELETE_MAX;

  // La lista cambió (se recargó tras una acción): fuera de la selección y del
  // detalle lo que ya no existe.
  React.useEffect(() => {
    const alive = new Set(templates.map((template) => template.id));
    setCheckedIds((prev) => {
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
    setSelectedId((prev) => (prev !== null && !alive.has(prev) ? null : prev));
  }, [templates]);

  const stopSelecting = React.useCallback(() => {
    setSelecting(false);
    setCheckedIds(new Set());
  }, []);

  const toggleChecked = React.useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < TEMPLATE_DELETE_MAX) next.add(id);
      return next;
    });
  }, []);

  const beyondUseIds = React.useMemo(
    () => templates.filter(isTemplateBeyondUse).map((template) => template.id),
    [templates],
  );

  /** Marca las rechazadas y las que no están en la cuenta. Solo selecciona. */
  const selectBeyondUse = React.useCallback(() => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const id of beyondUseIds) {
        if (next.size >= TEMPLATE_DELETE_MAX) break;
        next.add(id);
      }
      return next;
    });
  }, [beyondUseIds]);

  const confirmDelete = React.useCallback(async () => {
    const ids = pendingDelete.map((template) => template.id);
    setPendingDelete([]);
    if (!onDelete || ids.length === 0) return;
    const deletedIds = await onDelete(ids);
    if (deletedIds.length === 0) return;
    const gone = new Set(deletedIds);
    setCheckedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    // Sin nada pendiente de reintentar, se sale del modo selección.
    if ([...checkedIds].every((id) => gone.has(id))) setSelecting(false);
  }, [pendingDelete, onDelete, checkedIds]);

  // Auto-select first template on initial load
  React.useEffect(() => {
    if (templates.length > 0 && selectedId === null && panelView === "detail") {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId, panelView]);

  // Create form state
  const [formName, setFormName] = React.useState("");
  const [formBody, setFormBody] = React.useState("");
  const [formCategory, setFormCategory] = React.useState<"MARKETING" | "UTILITY">("MARKETING");
  const [formVariables, setFormVariables] = React.useState<Array<{ id: string; placeholder: string; sampleContent: string }>>([]);
  const [placeholderError, setPlaceholderError] = React.useState("");

  // ── Derived ───────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    return templates.filter((t) => {
      if (statusFilter !== "all" && t.metaTemplateStatus !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.body ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, statusFilter, search]);

  const selectedTemplate = templates.find((t) => t.id === selectedId) ?? null;

  const counts = React.useMemo(() => {
    const c = { all: templates.length, APPROVED: 0, PENDING: 0, REJECTED: 0, NOT_IN_ACCOUNT: 0 };
    for (const t of templates) {
      if (t.metaTemplateStatus === "APPROVED") c.APPROVED++;
      else if (t.metaTemplateStatus === "PENDING") c.PENDING++;
      else if (t.metaTemplateStatus === "REJECTED") c.REJECTED++;
      else if (t.metaTemplateStatus === "NOT_IN_ACCOUNT") c.NOT_IN_ACCOUNT++;
    }
    return c;
  }, [templates]);

  // ── Variable handling ─────────────────────────────────────────────
  const handleBodyChange = React.useCallback((text: string) => {
    setFormBody(text);
    const regex = /\{\{(\d+)}}/g;
    const found = new Map<string, boolean>();
    let m;
    while ((m = regex.exec(text)) !== null) found.set(m[1], true);
    const cleaned = text.replace(/\{\{\d+}}/g, "");
    if (cleaned.includes("{") || cleaned.includes("}")) {
      setPlaceholderError(t("settings.notifications.templates.malformedPlaceholders"));
      return;
    }
    const ids = Array.from(found.keys()).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== i + 1) {
        setPlaceholderError(
          t("settings.notifications.templates.consecutiveVariables").replace(
            "{placeholder}",
            `{{${i + 1}}}`,
          ),
        );
        return;
      }
    }
    setPlaceholderError("");
    setFormVariables((prev) =>
      ids.map((id) => {
        const existing = prev.find((v) => v.id === String(id));
        return { id: String(id), placeholder: `{{${id}}}`, sampleContent: existing?.sampleContent ?? "" };
      }),
    );
  }, [t]);

  const addVariable = React.useCallback(() => {
    const nextId = formVariables.length + 1;
    setFormBody((prev) => prev + `{{${nextId}}}`);
    setFormVariables((prev) => [...prev, { id: String(nextId), placeholder: `{{${nextId}}}`, sampleContent: "" }]);
  }, [formVariables.length]);

  const previewBody = React.useCallback(
    (text: string) => {
      let result = text;
      formVariables.forEach((v) => {
        if (v.sampleContent) result = result.replace(new RegExp(`\\{\\{${v.id}\\}\\}`, "g"), v.sampleContent);
      });
      return result;
    },
    [formVariables],
  );

  const resetForm = React.useCallback(() => {
    setFormName("");
    setFormBody("");
    setFormCategory("MARKETING");
    setFormVariables([]);
    setPlaceholderError("");
  }, []);

  const handleCreate = React.useCallback(async () => {
    await onCreate({ name: formName, body: formBody, category: formCategory, variables: formVariables });
    resetForm();
    setPanelView("detail");
  }, [formName, formBody, formCategory, formVariables, onCreate, resetForm]);

  const openCreate = React.useCallback(() => {
    resetForm();
    setSelectedId(null);
    setPanelView("create");
  }, [resetForm]);

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[500px] overflow-hidden rounded-xl border border-hairline bg-surface">
      {/* ── LEFT: Template list ─────────────────────────────────── */}
      <div className="flex w-[360px] shrink-0 flex-col border-r border-hairline">
        {/* Header */}
        {onDelete && selecting ? (
          <div role="toolbar" aria-label={t("settings.notifications.delete.select.toolbar")} className="space-y-1.5 border-b border-hairline px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink" aria-live="polite">
                {t("settings.notifications.delete.select.count").replace("{count}", String(checkedIds.size))}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={checkedIds.size === 0 || isDeleting}
                  onClick={() => setPendingDelete(templates.filter((template) => checkedIds.has(template.id)))}
                >
                  {isDeleting && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                  {t("settings.notifications.delete.action")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={stopSelecting} disabled={isDeleting}>
                  {t("settings.notifications.whatsapp.cancel")}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 py-0.5 text-xs text-brand hover:bg-transparent hover:text-brand-strong"
              disabled={beyondUseIds.length === 0 || isDeleting}
              title={t("settings.notifications.delete.select.beyondUseHint")}
              onClick={selectBeyondUse}
            >
              {t("settings.notifications.delete.select.beyondUse").replace("{count}", String(beyondUseIds.length))}
            </Button>
            {limitReached && (
              <p role="status" className="text-[11px] text-subtle">
                {t("settings.notifications.delete.select.limit").replace("{max}", String(TEMPLATE_DELETE_MAX))}
              </p>
            )}
          </div>
        ) : (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{t("navigation.templates")}</h3>
          <div className="flex items-center gap-1.5">
            {onDelete && templates.length > 0 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelecting(true)} title={t("settings.notifications.delete.select.start")} aria-label={t("settings.notifications.delete.select.start")}>
                <CheckSquare className="size-4" />
              </Button>
            )}
            {canSync && (
              <Button type="button" variant="ghost" size="icon" onClick={onSync} disabled={isSyncing || isRepublishing} title={t("settings.notifications.whatsapp.syncMeta")} aria-label={t("settings.notifications.whatsapp.syncMeta")}>
                {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              </Button>
            )}
            {canRepublish && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setConfirmingRepublish(true)} disabled={isSyncing || isRepublishing} title={t("settings.notifications.republish.action")} aria-label={t("settings.notifications.republish.action")}>
                {isRepublishing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={openCreate} title={t("settings.notifications.whatsapp.newTemplate")} aria-label={t("settings.notifications.whatsapp.newTemplate")}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        )}

        {/* Plantillas que la cuenta actual de WhatsApp no tiene */}
        {counts.NOT_IN_ACCOUNT > 0 && (
          <div role="status" className="flex gap-2 border-b border-orange-300/60 bg-orange-50 px-4 py-2.5 text-orange-900 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1.5">
              <p className="text-xs leading-snug">
                {t(counts.NOT_IN_ACCOUNT === 1 ? "settings.notifications.templates.unavailableBanner.one" : "settings.notifications.templates.unavailableBanner.many").replace("{count}", String(counts.NOT_IN_ACCOUNT))}{" "}
                {t(canRepublish ? "settings.notifications.templates.unavailableBanner.suggest" : "settings.notifications.templates.unavailableBanner.askAdmin")}
              </p>
              {canRepublish && (
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmingRepublish(true)} disabled={isSyncing || isRepublishing}>
                  {isRepublishing && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                  {t("settings.notifications.republish.action")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-hairline px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("settings.notifications.templates.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 overflow-x-auto border-b border-hairline px-3 py-2 scrollbar-none">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                statusFilter === filter
                  ? "bg-brand text-white"
                  : "bg-hover text-subtle hover:text-ink",
              )}
            >
              {t(STATUS_FILTER_LABEL_KEYS[filter])}
              {counts[filter] > 0 && (
                <span className="ml-1 opacity-70">{counts[filter]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Template rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t("settings.notifications.whatsapp.empty")}
              description={search ? t("settings.notifications.templates.noResults") : t("settings.notifications.templates.emptyDescription")}
              className="py-12"
            />
          ) : (
            <div className="flex flex-col">
              {filtered.map((template) => {
                const status = getStatusConfig(template.metaTemplateStatus, t);
                const isActive = template.id === selectedId && panelView === "detail";
                const isChecked = checkedIds.has(template.id);
                const cannotAdd = selecting && limitReached && !isChecked;
                return (
                  <div
                    key={template.id}
                    className={cn(
                      "group relative flex w-full items-center transition-colors",
                      "hover:bg-hover",
                      (selecting ? isChecked : isActive) && "bg-brand/[0.06] dark:bg-brand/10",
                    )}
                  >
                  {selecting && (
                    <Checkbox
                      checked={isChecked}
                      disabled={cannotAdd}
                      onCheckedChange={() => toggleChecked(template.id)}
                      aria-label={t("settings.notifications.delete.select.rowAria").replace("{name}", template.name)}
                      className="ml-4"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (selecting) {
                        if (!cannotAdd) toggleChecked(template.id);
                        return;
                      }
                      setSelectedId(template.id);
                      setPanelView("detail");
                    }}
                    // En modo selección la casilla es el control; la fila es un atajo de puntero.
                    tabIndex={selecting ? -1 : undefined}
                    aria-disabled={cannotAdd || undefined}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left",
                      selecting && "pl-3",
                      cannotAdd && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {template.name}
                      </span>
                      <span title={status.hint} className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11.5px] leading-[1.4] text-subtle">
                      {template.body || t("settings.notifications.templates.noContent")}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-subtle/60">
                      {template.provider && <span>{template.provider}</span>}
                      {template.category && (
                        <>
                          <span className="text-hairline">·</span>
                          <span>{getCategoryLabel(template.category, t)}</span>
                        </>
                      )}
                    </div>
                  </button>
                  {!selecting && onDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("settings.notifications.delete.rowMenu").replace("{name}", template.name)}
                          className={cn(
                            "absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full",
                            "border border-hairline bg-surface text-subtle shadow-sm hover:text-ink",
                            "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                          )}
                        >
                          <MoreVertical className="size-4" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" disabled={isDeleting} onClick={() => setPendingDelete([template])}>
                          <Trash2 className="size-4" />
                          {t("settings.notifications.delete.action")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail / Create ──────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {panelView === "create" ? (
          /* ── Create form ──────────────────────────────────────── */
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-hairline px-5 py-3">
              <Button type="button" variant="ghost" size="icon" onClick={() => setPanelView("detail")} aria-label={t("growth.actions.back")}>
                <ArrowLeft className="size-4" />
              </Button>
              <h3 className="text-sm font-semibold text-ink">{t("settings.notifications.whatsapp.newTemplate")}</h3>
            </div>

            {/* Content: form + preview side by side */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form — takes all available space */}
              <div className="flex flex-1 flex-col overflow-y-auto border-r border-hairline p-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl-name" className="text-xs">{t("settings.notifications.whatsapp.name")}</Label>
                      <Input id="tpl-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("settings.notifications.whatsapp.namePlaceholder")} className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl-cat" className="text-xs">{t("settings.notifications.templates.metaCategory")}</Label>
                      <Select value={formCategory} onValueChange={(v) => setFormCategory(v as "MARKETING" | "UTILITY")}>
                        <SelectTrigger id="tpl-cat" className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">{t("settings.notifications.templates.category.utility")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col space-y-1.5">
                    <Label htmlFor="tpl-body" className="text-xs">{t("settings.notifications.templates.messageContent")}</Label>
                    <TextArea
                      id="tpl-body"
                      value={formBody}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      placeholder={t("settings.notifications.templates.messagePlaceholder")}
                      rows={12}
                      className="min-h-[200px] flex-1 text-sm"
                    />
                    {placeholderError && (
                      <p className="text-xs text-rose-500">{placeholderError}</p>
                    )}
                    <div className="flex justify-end text-[11px] text-subtle">
                      {formBody.length}/1600
                    </div>
                  </div>

                  {/* Variables */}
                  {formVariables.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-subtle">{t("settings.notifications.templates.sampleContent")}</p>
                      {formVariables.map((v) => (
                        <div key={v.id} className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-right text-xs font-mono text-brand">{v.placeholder}</span>
                          <Input
                            value={v.sampleContent}
                            onChange={(e) => setFormVariables((prev) => prev.map((x) => x.id === v.id ? { ...x, sampleContent: e.target.value } : x))}
                            placeholder={t("settings.notifications.templates.samplePlaceholder")}
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" variant="ghost" size="sm" onClick={addVariable} className="text-brand hover:text-brand-strong">
                    <Plus className="size-3.5 mr-1" />
                    {t("settings.notifications.templates.addVariable")}
                  </Button>
                </div>
              </div>

              {/* Preview — fixed width */}
              <div className="flex w-[350px] shrink-0 flex-col items-center justify-start overflow-y-auto bg-canvas px-4 py-5">
                <p className="mb-3 text-xs font-medium text-subtle">{t("settings.notifications.templates.preview")}</p>
                <TemplatePhonePreview body={formBody ? previewBody(formBody) : ""} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-hairline px-5 py-3">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={savingTemplate || !formName.trim() || !formBody.trim() || !!placeholderError}
              >
                {savingTemplate && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {t("settings.notifications.whatsapp.create")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPanelView("detail")} disabled={savingTemplate}>
                {t("settings.notifications.whatsapp.cancel")}
              </Button>
            </div>
          </div>
        ) : selectedTemplate ? (
          /* ── Detail view ──────────────────────────────────────── */
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink">{selectedTemplate.name}</h3>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
                  {selectedTemplate.provider && <span>{selectedTemplate.provider}</span>}
                  {selectedTemplate.category && (
                    <>
                      <span className="text-hairline">·</span>
                      <span>{getCategoryLabel(selectedTemplate.category, t)}</span>
                    </>
                  )}
                  {selectedTemplate.metaTemplateName && (
                    <>
                      <span className="text-hairline">·</span>
                      <span className="font-mono">{selectedTemplate.metaTemplateName}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const s = getStatusConfig(selectedTemplate.metaTemplateStatus, t);
                  return <span title={s.hint} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", s.className)}>{s.label}</span>;
                })()}
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label={t("app.search.clear")}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Content: body + preview */}
            <div className="flex flex-1 overflow-hidden">
              {/* Body text */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-lg">
                  {selectedTemplate.metaTemplateStatus === "NOT_IN_ACCOUNT" && (
                    <div role="note" className="mb-4 flex gap-2 rounded-xl border border-dashed border-orange-400 bg-orange-50 p-3 text-xs leading-snug text-orange-900 dark:border-orange-500/60 dark:bg-orange-950/40 dark:text-orange-200">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <p>{t("settings.notifications.templates.status.notInAccountHint")}</p>
                    </div>
                  )}
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">{t("settings.notifications.whatsapp.content")}</p>
                  <div className="rounded-xl bg-canvas p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {selectedTemplate.body || t("settings.notifications.templates.noContent")}
                    </p>
                  </div>
                  {selectedTemplate.metaTemplateName && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-subtle">Meta ID</p>
                      <p className="font-mono text-xs text-subtle">{selectedTemplate.metaTemplateName}</p>
                    </div>
                  )}
                  {selectedTemplate.createdAt && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-subtle">{t("settings.notifications.templates.createdAt")}</p>
                      <p className="text-xs text-subtle">
                        {new Date(selectedTemplate.createdAt).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone preview */}
              <div className="flex w-[350px] shrink-0 flex-col items-center justify-start overflow-y-auto bg-canvas px-4 py-5">
                <p className="mb-3 text-xs font-medium text-subtle">{t("settings.notifications.templates.preview")}</p>
                <TemplatePhonePreview body={selectedTemplate.body ?? ""} />
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty state ──────────────────────────────────────── */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand/10">
              <MessageSquare className="size-6 text-brand" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">{t("settings.notifications.whatsapp.title")}</p>
              <p className="text-xs text-subtle">{t("settings.notifications.templates.selectOrCreate")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openCreate} className="mt-2">
              <Plus className="size-3.5 mr-1" />
              {t("settings.notifications.whatsapp.newTemplate")}
            </Button>
          </div>
        )}
      </div>
      <TemplateRepublishConfirm
        open={confirmingRepublish}
        onCancel={() => setConfirmingRepublish(false)}
        onConfirm={() => {
          setConfirmingRepublish(false);
          onRepublish?.();
        }}
      />
      <TemplateDeleteConfirm
        templates={pendingDelete}
        onCancel={() => setPendingDelete([])}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
