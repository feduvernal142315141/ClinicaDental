"use client";

import * as React from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_CHARS = 4096;
const WARN_THRESHOLD = 3800;
const MAX_ROWS = 4;
const LINE_HEIGHT_PX = 20;

// ── Component ──────────────────────────────────────────────────────────────

export interface InboxComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  disabledReason?: string;
  sending: boolean;
  className?: string;
}

export function InboxComposer({
  onSend,
  disabled,
  disabledReason,
  sending,
  className,
}: InboxComposerProps) {
  const [text, setText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const canSend = text.trim().length > 0 && !disabled && !sending && charCount <= MAX_CHARS;

  // Auto-grow textarea
  const adjustHeight = React.useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = LINE_HEIGHT_PX * MAX_ROWS + 16; // + padding
    ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = React.useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }, [canSend, onSend, text]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className={cn("border-t border-hairline bg-canvas", className)}>
      {/* Disabled reason */}
      {disabled && disabledReason && (
        <div className="px-4 pt-2">
          <p className="text-xs text-subtle">{disabledReason}</p>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "" : "Escribe un mensaje..."}
          disabled={disabled || sending}
          rows={1}
          maxLength={MAX_CHARS}
          className={cn(
            "flex-1 resize-none rounded-xl border border-hairline bg-elevated px-3 py-2.5 text-sm text-ink outline-none transition-colors",
            "placeholder:text-subtle",
            "focus:border-brand focus:ring-2 focus:ring-brand/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          style={{ lineHeight: `${LINE_HEIGHT_PX}px` }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            canSend
              ? "bg-brand-strong text-white hover:bg-brand-strong/90"
              : "bg-hover text-subtle cursor-not-allowed",
          )}
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>

      {/* Character counter */}
      {charCount > WARN_THRESHOLD && (
        <div className="flex justify-end px-4 pb-2">
          <span
            className={cn(
              "text-[11px]",
              charCount > MAX_CHARS ? "text-rose-500 font-medium" : "text-subtle",
            )}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  );
}
