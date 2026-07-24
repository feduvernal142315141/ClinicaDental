"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Loader2,
  ImageIcon,
  MessageSquare,
  Monitor,
  Globe,
  Palette,
  Clock,
  Send,
  Paperclip,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/primitives/shadcn/sheet";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { usePermission } from "@/lib/hooks/use-permission";
import { feedbackService } from "@/lib/services/feedback";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_TYPE_COLORS,
  type FeedbackTicket,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackPriority,
  type FeedbackAttachment,
  type FeedbackComment,
  type FeedbackMetadata,
} from "@/lib/entity/feedback";
import {
  FeedbackAttachmentLightbox,
  type LightboxImage,
} from "./FeedbackAttachmentLightbox";

interface FeedbackTicketDetailDrawerProps {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
  /** Se llama tras un cambio de estado exitoso para refrescar el listado. */
  onUpdated?: () => void;
}

const STATUS_OPTIONS: FeedbackStatus[] = [
  "pending",
  "in_review",
  "in_progress",
  "resolved",
  "closed",
];

const PRIORITY_OPTIONS: FeedbackPriority[] = ["low", "medium", "high"];

const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  improvement: Lightbulb,
  question: HelpCircle,
  other: MoreHorizontal,
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Error",
  improvement: "Mejora",
  question: "Pregunta",
  other: "Otro",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Normaliza adjuntos: el backend puede devolver objetos o URLs planas. */
function normalizeAttachments(
  raw: FeedbackTicket["attachments"] | string[] | unknown,
): LightboxImage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, i) => {
      if (typeof item === "string" && item.trim()) {
        return {
          id: `url-${i}`,
          url: item,
          name: `Captura ${i + 1}`,
        };
      }
      if (item && typeof item === "object") {
        const att = item as FeedbackAttachment & { url?: string };
        const url = att.secureUrl || att.url;
        if (!url) return null;
        return {
          id: att.id || `att-${i}`,
          url,
          name: att.originalFileName || `Captura ${i + 1}`,
        };
      }
      return null;
    })
    .filter((x): x is LightboxImage => Boolean(x?.url));
}

function commentBody(comment: FeedbackComment): string {
  return comment.body || comment.content || "";
}

function parseMetadata(
  raw: FeedbackTicket["metadata"] | string | null | undefined,
): FeedbackMetadata | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as FeedbackMetadata;
    } catch {
      return null;
    }
  }
  return raw;
}

export function FeedbackTicketDetailDrawer({
  ticketId,
  open,
  onClose,
  onUpdated,
}: FeedbackTicketDetailDrawerProps) {
  const { isAdmin } = usePermission();
  const [ticket, setTicket] = useState<FeedbackTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus>("pending");
  const [draftPriority, setDraftPriority] = useState<string>("none");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadTicket = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getTicketById(id);
      setTicket(data);
      setDraftStatus(data.status);
      setDraftPriority(data.priority ?? "none");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo cargar el reporte";
      setError(msg);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !ticketId) {
      setTicket(null);
      setError(null);
      setCommentText("");
      setLightboxIndex(null);
      setDraftStatus("pending");
      setDraftPriority("none");
      return;
    }
    void loadTicket(ticketId);
  }, [open, ticketId, loadTicket]);

  const statusDirty = Boolean(
    ticket &&
      (draftStatus !== ticket.status ||
        draftPriority !== (ticket.priority ?? "none")),
  );

  const images = useMemo(
    () => normalizeAttachments(ticket?.attachments),
    [ticket?.attachments],
  );

  const metadata = useMemo(
    () => parseMetadata(ticket?.metadata),
    [ticket?.metadata],
  );

  const TypeIcon = ticket
    ? (TYPE_ICONS[ticket.type] ?? MoreHorizontal)
    : MoreHorizontal;

  const handleSendComment = useCallback(async () => {
    if (!ticketId || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await feedbackService.addComment(ticketId, {
        body: commentText.trim(),
      });
      setCommentText("");
      notify.success("Comentario enviado");
      await loadTicket(ticketId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo enviar el comentario";
      notify.error(msg);
    } finally {
      setSendingComment(false);
    }
  }, [ticketId, commentText, loadTicket]);

  const handleSaveStatus = useCallback(async () => {
    if (!ticketId || !ticket || !statusDirty) return;
    setSavingStatus(true);
    try {
      const updated = await feedbackService.updateStatus(ticketId, {
        status: draftStatus,
        priority:
          draftPriority === "none"
            ? null
            : (draftPriority as FeedbackPriority),
      });
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              priority: updated.priority,
            }
          : prev,
      );
      setDraftStatus(updated.status);
      setDraftPriority(updated.priority ?? "none");
      notify.success("Estado actualizado");
      onUpdated?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo actualizar el estado";
      notify.error(msg);
    } finally {
      setSavingStatus(false);
    }
  }, [
    ticketId,
    ticket,
    statusDirty,
    draftStatus,
    draftPriority,
    onUpdated,
  ]);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-hairline bg-surface p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-hairline px-6 pb-4 pt-6">
            <SheetTitle className="text-base font-semibold text-ink">
              Detalle del reporte
            </SheetTitle>
            <SheetDescription className="text-subtle">
              {ticket
                ? `Enviado el ${formatDateTime(ticket.createdAt)}`
                : "Consulta la descripción, capturas y respuestas del equipo."}
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              {ticketId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadTicket(ticketId)}
                >
                  Reintentar
                </Button>
              ) : null}
            </div>
          ) : !ticket ? (
            <div className="flex flex-1 items-center justify-center px-6 py-12">
              <EmptyState
                icon={MessageSquare}
                title="Sin detalle"
                description="Selecciona un reporte del listado para verlo aquí."
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {/* Cabecera */}
                <section className="rounded-bento border border-hairline bg-canvas/40 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        FEEDBACK_TYPE_COLORS[ticket.type] ??
                          FEEDBACK_TYPE_COLORS.other,
                      )}
                    >
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-semibold leading-snug text-ink">
                        {ticket.subject || "Sin asunto"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            FEEDBACK_STATUS_COLORS[ticket.status],
                          )}
                        >
                          {FEEDBACK_STATUS_LABELS[ticket.status]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {TYPE_LABELS[ticket.type] ?? "Otro"}
                        </Badge>
                        {ticket.priority ? (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            Prioridad {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Gestión admin */}
                {isAdmin ? (
                  <section className="rounded-bento border border-brand/20 bg-brand/5 p-4">
                    <SectionTitle>Gestión del reporte</SectionTitle>
                    <p className="mb-3 text-xs text-subtle">
                      Solo visible para administradores. Los cambios se reflejan
                      de inmediato para el autor del reporte.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Estado
                        </label>
                        <Select
                          value={draftStatus}
                          onValueChange={(v) =>
                            setDraftStatus(v as FeedbackStatus)
                          }
                          disabled={savingStatus}
                        >
                          <SelectTrigger className="w-full bg-surface">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {FEEDBACK_STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Prioridad
                        </label>
                        <Select
                          value={draftPriority}
                          onValueChange={setDraftPriority}
                          disabled={savingStatus}
                        >
                          <SelectTrigger className="w-full bg-surface">
                            <SelectValue placeholder="Prioridad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {PRIORITY_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {PRIORITY_LABELS[p]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="shrink-0 sm:mb-0"
                        disabled={!statusDirty || savingStatus}
                        onClick={() => void handleSaveStatus()}
                      >
                        {savingStatus ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          "Guardar cambios"
                        )}
                      </Button>
                    </div>
                  </section>
                ) : null}

                {/* Descripción */}
                <section>
                  <SectionTitle>Descripción</SectionTitle>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {ticket.description}
                  </p>
                </section>

                {/* Capturas */}
                <section>
                  <SectionTitle>
                    Capturas
                    {images.length > 0 ? ` (${images.length})` : ""}
                  </SectionTitle>
                  {images.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-bento border border-dashed border-hairline bg-canvas/30 px-4 py-6 text-sm text-subtle">
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span>Este reporte no incluye capturas.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setLightboxIndex(i)}
                          className={cn(
                            "group relative aspect-[4/3] overflow-hidden rounded-bento border border-hairline bg-canvas",
                            "ring-offset-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                            "hover:border-brand/40 hover:shadow-md",
                          )}
                          aria-label={`Ver captura ${i + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                            <ImageIcon className="h-5 w-5 text-white drop-shadow" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Contexto técnico */}
                {metadata ? (
                  <section>
                    <SectionTitle>Contexto</SectionTitle>
                    <div className="grid gap-2 rounded-bento border border-hairline bg-canvas/30 p-3 text-xs text-subtle sm:grid-cols-2">
                      {metadata.currentRoute || metadata.currentUrl ? (
                        <MetaRow
                          icon={Globe}
                          label="Ruta"
                          value={metadata.currentRoute || metadata.currentUrl || "—"}
                        />
                      ) : null}
                      {metadata.browser ? (
                        <MetaRow
                          icon={Monitor}
                          label="Navegador"
                          value={metadata.browser}
                        />
                      ) : null}
                      {metadata.screenSize ? (
                        <MetaRow
                          icon={Monitor}
                          label="Resolución"
                          value={metadata.screenSize}
                        />
                      ) : null}
                      {metadata.theme ? (
                        <MetaRow
                          icon={Palette}
                          label="Tema"
                          value={metadata.theme}
                        />
                      ) : null}
                      {metadata.appVersion ? (
                        <MetaRow
                          icon={Clock}
                          label="Versión"
                          value={metadata.appVersion}
                        />
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {/* Comentarios */}
                <section>
                  <SectionTitle>
                    Respuestas
                    {ticket.comments?.length
                      ? ` (${ticket.comments.length})`
                      : ""}
                  </SectionTitle>
                  {!ticket.comments || ticket.comments.length === 0 ? (
                    <p className="rounded-bento border border-dashed border-hairline px-4 py-5 text-sm text-subtle">
                      Todavía no hay respuestas del equipo.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {ticket.comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-bento border border-hairline bg-canvas/40 px-3.5 py-3"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-ink">
                              {c.authorName || "Equipo"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
                            {commentBody(c)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Composer fijo */}
              <div className="border-t border-hairline bg-surface px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Escribe un comentario o aporte adicional…"
                    className={cn(
                      "min-h-[44px] flex-1 resize-none rounded-bento border border-hairline bg-canvas px-3 py-2 text-sm text-ink",
                      "placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    )}
                    disabled={sendingComment}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={sendingComment || !commentText.trim()}
                    onClick={() => void handleSendComment()}
                    aria-label="Enviar comentario"
                  >
                    {sendingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <FeedbackAttachmentLightbox
        images={images}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null && images.length > 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand/70" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-ink/80" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}
