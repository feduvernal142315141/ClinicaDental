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
import { TemplatePhonePreview } from "./TemplatePhonePreview";
import type { ClinicTemplate } from "@/lib/entity/settings";

// ── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "APPROVED" | "PENDING" | "REJECTED";
type PanelView = "detail" | "create";

export interface WhatsAppTemplatesPanelProps {
  templates: ClinicTemplate[];
  loading: boolean;
  /** Sync Meta templates */
  onSync: () => void;
  isSyncing: boolean;
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

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "REJECTED", label: "Rechazadas" },
];

function getStatusConfig(status?: string): { label: string; className: string } {
  switch (status) {
    case "APPROVED":
      return { label: "Aprobada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "PENDING":
      return { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "REJECTED":
      return { label: "Rechazada", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
    default:
      return { label: "Sin estado", className: "bg-hover text-subtle" };
  }
}

function getCategoryLabel(cat?: string): string {
  switch (cat) {
    case "MARKETING": return "Marketing";
    case "UTILITY": return "Utilidad";
    case "AUTHENTICATION": return "Autenticación";
    default: return cat ?? "";
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export function WhatsAppTemplatesPanel({
  templates,
  loading,
  onSync,
  isSyncing,
  onCreate,
  savingTemplate,
}: WhatsAppTemplatesPanelProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [panelView, setPanelView] = React.useState<PanelView>("detail");

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
    const c = { all: templates.length, APPROVED: 0, PENDING: 0, REJECTED: 0 };
    for (const t of templates) {
      if (t.metaTemplateStatus === "APPROVED") c.APPROVED++;
      else if (t.metaTemplateStatus === "PENDING") c.PENDING++;
      else if (t.metaTemplateStatus === "REJECTED") c.REJECTED++;
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
      setPlaceholderError("Llaves malformadas. Use {{1}}, {{2}}, etc.");
      return;
    }
    const ids = Array.from(found.keys()).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== i + 1) {
        setPlaceholderError(`Variables deben ser consecutivas. Se esperaba {{${i + 1}}}.`);
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
  }, []);

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
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Plantillas</h3>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon" onClick={onSync} disabled={isSyncing} title="Sincronizar con Meta" aria-label="Sincronizar con Meta">
              {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={openCreate} title="Nueva plantilla" aria-label="Nueva plantilla">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-hairline px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plantilla..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 overflow-x-auto border-b border-hairline px-3 py-2 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-brand text-white"
                  : "bg-hover text-subtle hover:text-ink",
              )}
            >
              {f.label}
              {counts[f.value] > 0 && (
                <span className="ml-1 opacity-70">{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Template rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Sin plantillas"
              description={search ? "No se encontraron resultados." : "Sincroniza con Meta o crea una nueva."}
              className="py-12"
            />
          ) : (
            <div className="flex flex-col">
              {filtered.map((t) => {
                const status = getStatusConfig(t.metaTemplateStatus);
                const isActive = t.id === selectedId && panelView === "detail";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedId(t.id); setPanelView("detail"); }}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                      "hover:bg-hover",
                      isActive && "bg-brand/[0.06] dark:bg-brand/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {t.name}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11.5px] leading-[1.4] text-subtle">
                      {t.body || "Sin contenido"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-subtle/60">
                      {t.provider && <span>{t.provider}</span>}
                      {t.category && (
                        <>
                          <span className="text-hairline">·</span>
                          <span>{getCategoryLabel(t.category)}</span>
                        </>
                      )}
                    </div>
                  </button>
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
              <Button type="button" variant="ghost" size="icon" onClick={() => setPanelView("detail")} aria-label="Volver">
                <ArrowLeft className="size-4" />
              </Button>
              <h3 className="text-sm font-semibold text-ink">Nueva plantilla</h3>
            </div>

            {/* Content: form + preview side by side */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form — takes all available space */}
              <div className="flex flex-1 flex-col overflow-y-auto border-r border-hairline p-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl-name" className="text-xs">Nombre</Label>
                      <Input id="tpl-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="p.ej. appointment_reminder_24h" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tpl-cat" className="text-xs">Categoría Meta</Label>
                      <Select value={formCategory} onValueChange={(v) => setFormCategory(v as "MARKETING" | "UTILITY")}>
                        <SelectTrigger id="tpl-cat" className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utilidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col space-y-1.5">
                    <Label htmlFor="tpl-body" className="text-xs">Contenido del mensaje</Label>
                    <TextArea
                      id="tpl-body"
                      value={formBody}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      placeholder="Escribe el contenido de la plantilla. Usa {{1}}, {{2}} para variables..."
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
                      <p className="text-xs font-medium text-subtle">Contenido de muestra para variables</p>
                      {formVariables.map((v) => (
                        <div key={v.id} className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-right text-xs font-mono text-brand">{v.placeholder}</span>
                          <Input
                            value={v.sampleContent}
                            onChange={(e) => setFormVariables((prev) => prev.map((x) => x.id === v.id ? { ...x, sampleContent: e.target.value } : x))}
                            placeholder="Ej: Juan Pérez"
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" variant="ghost" size="sm" onClick={addVariable} className="text-brand hover:text-brand-strong">
                    <Plus className="size-3.5 mr-1" />
                    Agregar variable
                  </Button>
                </div>
              </div>

              {/* Preview — fixed width */}
              <div className="flex w-[350px] shrink-0 flex-col items-center justify-start overflow-y-auto bg-canvas px-4 py-5">
                <p className="mb-3 text-xs font-medium text-subtle">Vista previa</p>
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
                Crear plantilla
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPanelView("detail")} disabled={savingTemplate}>
                Cancelar
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
                      <span>{getCategoryLabel(selectedTemplate.category)}</span>
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
                  const s = getStatusConfig(selectedTemplate.metaTemplateStatus);
                  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", s.className)}>{s.label}</span>;
                })()}
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="Cerrar">
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Content: body + preview */}
            <div className="flex flex-1 overflow-hidden">
              {/* Body text */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-lg">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Contenido</p>
                  <div className="rounded-xl bg-canvas p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {selectedTemplate.body || "Sin contenido"}
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
                      <p className="text-xs font-medium uppercase tracking-wider text-subtle">Creada</p>
                      <p className="text-xs text-subtle">
                        {new Date(selectedTemplate.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone preview */}
              <div className="flex w-[350px] shrink-0 flex-col items-center justify-start overflow-y-auto bg-canvas px-4 py-5">
                <p className="mb-3 text-xs font-medium text-subtle">Vista previa</p>
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
              <p className="text-sm font-semibold text-ink">Plantillas de WhatsApp</p>
              <p className="text-xs text-subtle">Selecciona una plantilla o crea una nueva</p>
            </div>
            <Button size="sm" variant="outline" onClick={openCreate} className="mt-2">
              <Plus className="size-3.5 mr-1" />
              Nueva plantilla
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
