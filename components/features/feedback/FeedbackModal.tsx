"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  Loader2,
  ImagePlus,
  MonitorUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/shadcn/dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { useFeedbackForm } from "@/lib/hooks/feedback/use-feedback-form";
import type { FeedbackType } from "@/lib/entity/feedback";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS: {
  value: FeedbackType;
  label: string;
  icon: typeof Bug;
  color: string;
}[] = [
  {
    value: "bug",
    label: "Error",
    icon: Bug,
    color: "border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400",
  },
  {
    value: "improvement",
    label: "Mejora",
    icon: Lightbulb,
    color: "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  },
  {
    value: "question",
    label: "Pregunta",
    icon: HelpCircle,
    color: "border-cyan-500/40 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400",
  },
  {
    value: "other",
    label: "Otro",
    icon: MoreHorizontal,
    color: "border-gray-500/40 bg-gray-500/5 text-gray-600 dark:text-gray-400",
  },
];

const DESCRIPTION_PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: "Describe qué pasó y qué esperabas que pasara.\n\nEj: \"Al presionar Guardar, la cita desaparece de la agenda. Pasó dos veces.\"",
  improvement:
    "Describe qué te gustaría que la app hiciera diferente.\n\nEj: \"Sería útil poder ver las citas del día en un calendario más grande.\"",
  question:
    "Describe tu duda.\n\nEj: \"¿Cómo puedo exportar el historial clínico de un paciente?\"",
  other: "Describe lo que necesitas reportar.",
};

const SUBJECT_PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: "Ej: No se guarda la cita",
  improvement: "Ej: Mejorar vista de agenda semanal",
  question: "Ej: ¿Cómo exporto historial?",
  other: "Asunto del reporte",
};

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const {
    type,
    setType,
    subject,
    setSubject,
    description,
    setDescription,
    attachments,
    addAttachment,
    removeAttachment,
    submitting,
    submitted,
    error,
    submit,
    reset,
  } = useFeedbackForm();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar paste global (Ctrl+V / Cmd+V) para pegar screenshots
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const named = new File(
              [file],
              `captura-${Date.now()}.png`,
              { type: file.type },
            );
            addAttachment(named);
            notify.info("Captura pegada");
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open, addAttachment]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    const ticketId = await submit();
    if (ticketId) {
      notify.success("Reporte enviado", {
        description:
          "Tu reporte fue recibido. Puedes ver el estado en la página de Soporte.",
      });
      setTimeout(handleClose, 1500);
    }
  }, [submit, handleClose]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (file.size > 5 * 1024 * 1024) {
          notify.warning("Archivo muy grande", {
            description: "El tamaño máximo por archivo es 5MB.",
          });
          return;
        }
        addAttachment(file);
      });
      e.target.value = "";
    },
    [addAttachment],
  );

  // Drag and drop
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer.files;
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
          addAttachment(file);
        }
      });
    },
    [addAttachment],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reportar feedback</DialogTitle>
          <DialogDescription>
            Ayúdanos a mejorar la app. Tu reporte llegará al equipo de
            desarrollo.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-lg font-medium">Reporte enviado</p>
            <p className="text-sm text-muted-foreground text-center">
              Puedes seguir el estado en la página de Soporte.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de reporte</Label>
              <div className="grid grid-cols-4 gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all text-center",
                        selected
                          ? opt.color
                          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asunto */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-subject">Asunto</Label>
              <Input
                id="feedback-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={SUBJECT_PLACEHOLDERS[type]}
                maxLength={200}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-description">Descripción</Label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={DESCRIPTION_PLACEHOLDERS[type]}
                rows={3}
                className={cn(
                  "flex w-full rounded-xl border border-hairline bg-elevated px-3 py-2.5 text-sm text-ink outline-none transition-colors",
                  "placeholder:text-subtle",
                  "focus:border-brand focus:ring-2 focus:ring-brand/30",
                  "resize-none",
                )}
              />
              {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}
            </div>

            {/* Adjuntos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Capturas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs"
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  Subir imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <AttachmentThumb
                      key={`${file.name}-${i}`}
                      file={file}
                      onRemove={() => removeAttachment(i)}
                    />
                  ))}
                </div>
              )}

              {/* Zona de drop / paste */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors",
                  dragging ? "border-brand bg-brand/5" : "border-hairline",
                )}
              >
                <MonitorUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-ink">
                    {isMac ? "⌘+Shift+4" : "Win+Shift+S"}
                  </span>
                  {" para capturar, luego "}
                  <kbd className="rounded border border-hairline bg-muted px-1 py-0.5 text-[10px] font-mono">
                    {isMac ? "⌘V" : "Ctrl+V"}
                  </kbd>
                  {" o arrastra"}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !description.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar reporte"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentThumb({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;

  return (
    <div className="group relative h-16 w-16 overflow-hidden rounded-lg border border-hairline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={file.name} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Eliminar ${file.name}`}
      >
        <Trash2 className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}
