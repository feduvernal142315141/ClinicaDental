"use client";

import * as React from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useI18n } from "@/lib/contexts/i18n-context";

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
  const { t } = useI18n();
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
    <div className={cn("shrink-0 border-t border-hairline bg-surface", className)}>
      {/* Disabled reason */}
      {disabled && disabledReason && (
        <div className="px-4 pt-2.5 pb-1">
          <p className="text-xs text-subtle">{disabledReason}</p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2.5 sm:px-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "" : t("inbox.composer.placeholder")}
          disabled={disabled || sending}
          rows={1}
          maxLength={MAX_CHARS}
          className={cn(
            "flex-1 resize-none rounded-2xl border border-hairline bg-canvas px-4 py-2.5 text-sm text-ink outline-none transition-colors",
            "placeholder:text-subtle/60",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          style={{ lineHeight: `${LINE_HEIGHT_PX}px` }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={t("inbox.action.sendMessage")}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition-all",
            canSend
              ? "bg-brand text-white shadow-sm hover:bg-brand-strong active:scale-95"
              : "bg-hover text-subtle/40 cursor-not-allowed",
          )}
        >
          <SendHorizontal className="size-[18px]" />
        </button>
      </div>

      {/* Footer: hint + counter */}
      {(!disabled || charCount > WARN_THRESHOLD) && (
        <div className="flex items-center justify-between px-4 pb-1.5">
          {!disabled && (
            <span className="text-[10px] text-subtle/40 select-none">
              {t("inbox.composer.hint")}
            </span>
          )}
          <span className="flex-1" />
          {charCount > WARN_THRESHOLD && (
            <span
              className={cn(
                "text-[11px]",
                charCount > MAX_CHARS ? "text-rose-500 font-medium" : "text-subtle",
              )}
            >
              {charCount}/{MAX_CHARS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
