"use client";

import { Tooltip } from "antd";
import { Mic } from "lucide-react";

interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  size?: number;
  disabled?: boolean;
}

export function MicButton({
  isListening,
  isSupported,
  onToggle,
  size = 14,
  disabled = false,
}: MicButtonProps) {
  if (!isSupported) return null;

  const label = isListening ? "Detener dictado" : "Dictar por voz";

  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={isListening}
        onClick={onToggle}
        disabled={disabled}
        className={`p-1.5 rounded text-sm transition-colors ${
          isListening
            ? "text-red-500 animate-pulse bg-red-50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? (
          <Mic size={size} className="text-red-500" />
        ) : (
          <Mic size={size} />
        )}
      </button>
    </Tooltip>
  );
}
