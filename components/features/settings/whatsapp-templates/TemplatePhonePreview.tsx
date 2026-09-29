"use client";

import { cn } from "@/lib/utils/utils";
import { ChevronLeft, MoreVertical, Phone, Video } from "lucide-react";

export interface TemplatePhonePreviewProps {
  body: string;
  className?: string;
}

/**
 * Premium WhatsApp phone mockup — iPhone-style.
 * Screen fills the entire frame interior (edge to edge).
 * Dynamic Island floats over the screen content.
 */
export function TemplatePhonePreview({
  body,
  className,
}: TemplatePhonePreviewProps) {
  const isEmpty = !body.trim();

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Phone frame */}
      <div className="relative w-[300px] rounded-[2.8rem] border-[5px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.4)] dark:border-[#2a2a2a] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)]">
        {/* Screen — fills entire interior, edge to edge */}
        <div className="overflow-hidden rounded-[2.3rem]">
          {/* Status bar — screen content starts here, under the Dynamic Island */}
          <div className="relative flex items-center justify-between bg-[#075e54] px-5 pb-0 pt-[38px] dark:bg-[#1f2c34]">
            <span className="text-[10px] font-semibold text-white/90">9:41</span>
            <div className="flex items-center gap-1.5">
              {/* Signal */}
              <svg viewBox="0 0 18 12" className="h-[10px] w-3.5 fill-white/90">
                <rect x="0" y="8" width="3" height="4" rx="0.7" />
                <rect x="5" y="5" width="3" height="7" rx="0.7" />
                <rect x="10" y="2" width="3" height="10" rx="0.7" />
                <rect x="15" y="0" width="3" height="12" rx="0.7" />
              </svg>
              {/* WiFi */}
              <svg viewBox="0 0 16 14" className="h-[10px] w-3 fill-white/90">
                <path d="M8 12a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4 8.5C5.1 7.4 6.5 6.7 8 6.7s2.9.7 4 1.8L10.8 9.7c-.7-.7-1.7-1.2-2.8-1.2s-2.1.5-2.8 1.2L4 8.5zM1 5.5C2.9 3.6 5.3 2.5 8 2.5s5.1 1.1 7 3L13.8 6.7C12.2 5.1 10.2 4.2 8 4.2S3.8 5.1 2.2 6.7L1 5.5z" />
              </svg>
              {/* Battery */}
              <svg viewBox="0 0 28 13" className="h-[10px] w-[18px]">
                <rect x="0.5" y="0.5" width="23" height="12" rx="2.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
                <rect x="2.5" y="2.5" width="18" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
                <path d="M25 4.5v4a2 2 0 000-4z" fill="white" fillOpacity="0.5" />
              </svg>
            </div>
          </div>

          {/* WhatsApp nav bar */}
          <div className="flex items-center gap-2 bg-[#075e54] px-2 pb-2.5 pt-0.5 dark:bg-[#1f2c34]">
            <ChevronLeft className="size-5 shrink-0 text-white/90" />
            <div className="flex size-8 items-center justify-center rounded-full bg-[#dfe5e7] dark:bg-[#6b7c85]">
              <svg viewBox="0 0 212 212" className="size-5 fill-white">
                <path d="M106 0C47.5 0 0 47.5 0 106s47.5 106 106 106 106-47.5 106-106S164.5 0 106 0zm0 60c16.6 0 30 13.4 30 30s-13.4 30-30 30-30-13.4-30-30 13.4-30 30-30zm0 130c-26.2 0-49.4-13.4-63-33.8 .3-20.9 42-32.4 63-32.4s62.7 11.5 63 32.4C155.4 176.6 132.2 190 106 190z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">Clínica Dental</p>
              <p className="text-[10px] text-white/50">en línea</p>
            </div>
            <div className="flex items-center gap-3">
              <Video className="size-[18px] text-white/90" />
              <Phone className="size-[15px] text-white/90" />
              <MoreVertical className="size-[18px] text-white/90" />
            </div>
          </div>

          {/* Chat area */}
          <div
            className="relative p-3"
            style={{
              minHeight: 340,
              backgroundColor: "#efeae2",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c3ba' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Dark mode bg */}
            <div className="absolute inset-0 hidden dark:block" style={{ backgroundColor: "#0b141a" }} />

            <div className="relative">
              {isEmpty ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="rounded-lg bg-white/60 px-4 py-2 shadow-sm dark:bg-white/10">
                    <p className="text-center text-[11px] text-black/40 dark:text-white/30">
                      El mensaje aparecerá aquí...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[88%]">
                  <div className="relative rounded-lg rounded-tl-[3px] bg-white px-2.5 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.08)] dark:bg-[#202c33]">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.45] text-[#111b21] dark:text-[#e9edef]">
                      {body}
                      <span className="float-right ml-2 mt-1 inline-block h-0 w-[52px] select-none" aria-hidden="true">{"\u200B"}</span>
                    </p>
                    <span className="float-right -mt-4 text-[10px] text-[#667781] dark:text-[#8696a0]">
                      12:00
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-1.5 bg-[#f0f0f0] px-2 py-1.5 dark:bg-[#1f2c34]">
            <div className="flex size-8 shrink-0 items-center justify-center">
              <svg viewBox="0 0 24 24" className="size-[22px] fill-[#8696a0]">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm5.076-8.803c-.218-.367-.608-.484-.975-.266-.367.218-.484.608-.266.975C16.673 15.251 14.645 16.5 12 16.5s-4.673-1.249-5.835-2.594c-.218-.367-.608-.484-.975-.266-.367.218-.484.608-.266.975C6.327 16.478 8.887 18 12 18s5.673-1.522 7.076-3.803z" />
              </svg>
            </div>
            <div className="h-9 flex-1 rounded-full bg-white px-3 dark:bg-[#2a3942]">
              <span className="text-[13px] leading-9 text-[#8696a0]">Mensaje</span>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00a884]">
              <svg viewBox="0 0 24 24" className="size-5 fill-white">
                <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H4.761c0 4.001 3.178 7.297 7.061 7.885v3.884h.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-1z" />
              </svg>
            </div>
          </div>

          {/* Home indicator — inside the screen, at the bottom */}
          <div className="flex justify-center bg-[#f0f0f0] pb-2 pt-1 dark:bg-[#1f2c34]">
            <div className="h-[5px] w-[100px] rounded-full bg-black/20 dark:bg-white/20" />
          </div>
        </div>

        {/* Dynamic Island — floats OVER the screen content */}
        <div className="pointer-events-none absolute left-1/2 top-[9px] -translate-x-1/2">
          <div className="h-[25px] w-[95px] rounded-full bg-[#0a0a0a]" />
        </div>
      </div>
    </div>
  );
}
