"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
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

export function ClinicalNotesEditor({
  initialContent,
  updatedAt,
  updatedBy,
  readOnly = false,
  onSave,
  saving,
}: ClinicalNotesEditorProps) {
  const [content, setContent] = useState(initialContent ?? "");
  /**
   * Cuando está activo el dictado pedirá al backend que estructure el audio
   * en formato SOAP (Subjetivo/Objetivo/Análisis/Plan) usando IA.
   * Desactivado por defecto — la transcripción cruda es la opción segura.
   */
  const [useSoapStructuring, setUseSoapStructuring] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExtension,
      Placeholder.configure({
        placeholder: "Escribe aquí las notas del historial...",
      }),
    ],
    content: initialContent ?? "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Sync when initialContent changes (snapshot load)
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const current = editor.getHTML();
      if (current !== initialContent) {
        editor.commands.setContent(initialContent ?? "");
        setContent(initialContent ?? "");
      }
    }
  }, [initialContent, editor]);

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
  };

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
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      {!readOnly && editor && (
        <div className="flex items-center gap-0.5 flex-wrap border rounded-md px-2 py-1 bg-muted/30">
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
          <span className="mx-1 text-border">|</span>
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
          <span className="mx-1 text-border">|</span>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 text-border">|</span>
          <MicButton
            isListening={isRecording}
            isSupported={true}
            onToggle={handleMicToggle}
          />
          <span className="mx-1 text-border">|</span>
          {/* Opt-in: estructuración SOAP por IA — OFF por defecto */}
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
              className="text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap"
            >
              Formatear con IA (SOAP)
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Más información sobre el formateo SOAP"
                  className="text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Editor area */}
      <div className="border rounded-md min-h-[160px] px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-2">
        <EditorContent editor={editor} />
      </div>

      {/* Status preview — shown while dictating or processing */}
      {isRecording && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50/50 border border-red-200 border-dashed text-sm text-red-600 italic">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
            Dictando... presiona de nuevo para finalizar
          </div>
          {interimText && (
            <div className="px-3 py-2 rounded-md bg-muted/40 border border-dashed text-sm text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-0.5">
                Preview en vivo
              </span>
              {interimText}
              <span className="inline-block w-0.5 h-3.5 bg-foreground/40 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          )}
        </div>
      )}
      {!isRecording && isProcessing && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50/50 border border-blue-200 border-dashed text-sm text-blue-600 italic">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin flex-shrink-0" />
          {useSoapStructuring
            ? "Estructurando con IA (SOAP)..."
            : "Procesando dictado..."}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {updatedBy && (
            <p className="text-xs text-muted-foreground">
              Guardado por {updatedBy}
              {updatedAt ? ` · ${formatRelativeDate(updatedAt)}` : ""}
            </p>
          )}
          {/* Indicador de origen del último dictado */}
          {lastTranscriptSource && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                lastTranscriptSource === "ai"
                  ? "bg-brand/10 text-brand"
                  : "bg-muted text-muted-foreground"
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
