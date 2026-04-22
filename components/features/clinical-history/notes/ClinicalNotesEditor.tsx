"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button as AntButton } from "antd";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
} from "lucide-react";

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
        </div>
      )}

      {/* Editor area */}
      <div className="border rounded-md min-h-[160px] px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-2">
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {updatedBy && (
            <p className="text-xs text-muted-foreground">
              Guardado por {updatedBy}
              {updatedAt ? ` · ${formatRelativeDate(updatedAt)}` : ""}
            </p>
          )}
        </div>
        {!readOnly && (
          <AntButton
            type="primary"
            size="small"
            onClick={handleSave}
            loading={saving}
          >
            Guardar notas
          </AntButton>
        )}
      </div>
    </div>
  );
}
