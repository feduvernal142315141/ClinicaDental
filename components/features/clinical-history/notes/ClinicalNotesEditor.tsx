"use client";

import { useState, useEffect, useRef } from "react";
import {
  useVisitNoteDrafts,
  type VisitNoteDraft,
} from "@/lib/store/useVisitNoteDrafts";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlertTriangle,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Mic,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  NO_AUTHORSHIP_LABEL,
  resolveAuthorship,
} from "@/lib/utils/clinical-authorship";
import { MicButton } from "@/components/ui/atomic/MicButton";
import { useGroqDictation } from "@/lib/hooks/speech/use-groq-dictation";
import { Switch } from "@/components/ui/atomic/forms/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/primitives/shadcn/tooltip";

interface ClinicalNotesEditorProps {
  patientId: string;
  initialContent?: string;
  draftKey?: string;
  updatedAt?: string;
  updatedBy?: string;
  readOnly?: boolean;
  onSave: (html: string) => Promise<void>;
  saving: boolean;
}
function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "hace un momento";
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `hace ${diffDays} d`;
    return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}
function isServerNewer(
  draftBase: string | undefined,
  serverStamp: string | undefined,
): boolean {
  if (!serverStamp) return false;
  if (!draftBase) return true;
  const base = Date.parse(draftBase);
  const server = Date.parse(serverStamp);
  if (Number.isNaN(base) || Number.isNaN(server)) {
    return draftBase !== serverStamp;
  }
  return server > base;
}
function readOwnDraft(
  draftKey: string | undefined,
  userId: string | undefined,
): VisitNoteDraft | undefined {
  if (!draftKey) return undefined;
  const draft = useVisitNoteDrafts.getState().getDraft(draftKey);
  if (!draft) return undefined;
  if (draft.userId && userId && draft.userId !== userId) return undefined;
  return draft;
}
export function ClinicalNotesEditor({
  initialContent,
  draftKey,
  updatedAt,
  updatedBy,
  readOnly = false,
  onSave,
  saving,
}: ClinicalNotesEditorProps) {
  const { user } = useAuth();
  const { setDraft, clearDraft } = useVisitNoteDrafts();
  const restoredDraft = readOwnDraft(draftKey, user?.id);
  const [content, setContent] = useState(
    restoredDraft?.html ?? initialContent ?? "",
  );
  const draftBaseRef = useRef<string | undefined>(
    restoredDraft ? restoredDraft.baseUpdatedAt : updatedAt,
  );
  const draftMetaRef = useRef<{ key?: string; userId?: string }>({
    key: draftKey,
    userId: user?.id,
  });
  draftMetaRef.current = { key: draftKey, userId: user?.id };
  const [serverDivergence, setServerDivergence] = useState<{
    html: string;
    updatedAt?: string;
  } | null>(null);
  const [useSoapStructuring, setUseSoapStructuring] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Escribe aquí las notas del historial...",
      }),
    ],
    content: restoredDraft?.html ?? initialContent ?? "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      const { key, userId } = draftMetaRef.current;
      if (key) {
        setDraft(key, {
          html,
          baseUpdatedAt: draftBaseRef.current,
          userId,
        });
      }
    },
  });

  useEffect(() => {
    if (!editor || initialContent === undefined) return;
    const draft = readOwnDraft(draftKey, draftMetaRef.current.userId);
    if (draft !== undefined) {
      const diverged =
        isServerNewer(draft.baseUpdatedAt, updatedAt) &&
        (initialContent ?? "") !== draft.html;
      setServerDivergence(
        diverged ? { html: initialContent ?? "", updatedAt } : null,
      );
      return;
    }
    setServerDivergence(null);
    draftBaseRef.current = updatedAt;
    const current = editor.getHTML();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent ?? "", { emitUpdate: false });
      setContent(initialContent ?? "");
    }
  }, [initialContent, editor, draftKey, updatedAt]);
  const {
    isRecording,
    isProcessing,
    interimText,
    lastTranscriptSource,
    startRecording,
    stopRecording,
  } = useGroqDictation({
    useSoapStructuring,
    onResult: (transcript) => {
      editor?.commands.insertContent(transcript + " ");
      editor?.commands.focus();
    },
  });
  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  const handleSave = async () => {
    await onSave(content);
    if (draftKey) clearDraft(draftKey);
    setServerDivergence(null);
  };

  const handleUseServerVersion = () => {
    if (!editor || !serverDivergence) return;
    editor.commands.setContent(serverDivergence.html, { emitUpdate: false });
    setContent(serverDivergence.html);
    draftBaseRef.current = serverDivergence.updatedAt;
    if (draftKey) clearDraft(draftKey);
    setServerDivergence(null);
  };
  const author = resolveAuthorship(updatedBy);
  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 text-sm transition-colors ${
        active
          ? "bg-brand text-white"
          : "text-subtle hover:bg-hover hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      {!readOnly && editor && (
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-hairline bg-elevated px-2 py-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
          >
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px shrink-0 bg-hairline" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px shrink-0 bg-hairline" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px shrink-0 bg-hairline" />
          <MicButton
            isListening={isRecording}
            isSupported={true}
            onToggle={handleMicToggle}
          />
          <span className="mx-1 h-4 w-px shrink-0 bg-hairline" />
          <div className="flex items-center gap-1.5">
            <Switch
              id="soap-toggle"
              checked={useSoapStructuring}
              onCheckedChange={setUseSoapStructuring}
              disabled={isRecording || isProcessing}
              aria-label="Formatear con IA (SOAP)"
              className="h-4 w-7 [&>span]:h-3.5 [&>span]:w-3.5"
            />
            <label
              htmlFor="soap-toggle"
              className="cursor-pointer select-none whitespace-nowrap text-xs text-subtle"
            >
              Formatear con IA (SOAP)
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Más información sobre el formateo SOAP"
                  className="text-subtle transition-colors hover:text-ink"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[240px] text-center text-xs"
              >
                Envía el audio a IA (Gemini) para estructurarlo en formato
                SOAP: Subjetivo, Objetivo, Análisis, Plan. Si la IA falla, se
                inserta la transcripción cruda sin error.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
      {serverDivergence && (
        <div
          role="alert"
          className="rounded-lg bg-amber-500/15 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">
                Esta nota cambió en el servidor mientras tenías texto sin guardar
              </p>
              <p className="mt-1 leading-relaxed opacity-90">
                Lo que ves en el editor es tu borrador sin guardar. En el
                servidor hay una versión más reciente
                {serverDivergence.updatedAt
                  ? ` (${formatRelativeDate(serverDivergence.updatedAt)})`
                  : ""}{" "}
                que no está aquí: si guardas ahora, la reemplazarás por completo
                y no se podrá recuperar.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseServerVersion}
                >
                  Traer la versión del servidor y descartar mi borrador
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setServerDivergence(null)}
                >
                  Seguir con mi borrador
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-[160px] rounded-xl border border-hairline bg-elevated px-3 py-2.5 text-sm text-ink transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-subtle [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-2">
        <EditorContent editor={editor} />
      </div>
      {isRecording && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm italic text-rose-600 dark:text-rose-400">
            <span className="inline-block h-2 w-2 shrink-0 animate-ping rounded-full bg-rose-500" />
            Dictando… presiona de nuevo para finalizar
          </div>
          {interimText && (
            <div className="rounded-lg border border-dashed border-hairline bg-hover px-3 py-2 text-sm text-subtle">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-subtle">
                Preview en vivo
              </span>
              {interimText}
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-ink/40 align-text-bottom" />
            </div>
          )}
        </div>
      )}
      {!isRecording && isProcessing && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-sm italic text-sky-600 dark:text-sky-400">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin flex-shrink-0" />
          {useSoapStructuring
            ? "Estructurando con IA (SOAP)..."
            : "Procesando dictado..."}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(author || updatedAt) && (
            <p className="text-xs text-subtle">
              {author ? (
                <>Guardado por {author}</>
              ) : (
                <span className="italic">{NO_AUTHORSHIP_LABEL}</span>
              )}
              {updatedAt ? ` · ${formatRelativeDate(updatedAt)}` : ""}
            </p>
          )}
          {lastTranscriptSource && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                lastTranscriptSource === "ai"
                  ? "bg-brand/10 text-brand"
                  : "bg-hover text-subtle"
              }`}
            >
              {lastTranscriptSource === "ai" ? (
                <>
                  <Sparkles className="h-2.5 w-2.5" />
                  formateado por IA
                </>
              ) : (
                <>
                  <Mic className="h-2.5 w-2.5" />
                  transcripción cruda
                </>
              )}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && (
              <span className="inline-block h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            Guardar notas
          </button>
        )}
      </div>
    </div>
  );
}
