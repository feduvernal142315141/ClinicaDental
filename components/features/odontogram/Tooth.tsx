"use client";
import React from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import RealToothSVGDefault, { RealToothSVG as RealToothSVGNamed } from "./teethSvgs";
import { ToothInfo, ToothStatus, ToothVariant } from "./consts";

const ToothSVG = (RealToothSVGNamed ?? RealToothSVGDefault) as React.FC<{
  status?: ToothStatus;
  variant: ToothVariant;
}>;

export type ToothProps = {
  info: ToothInfo;
  value?: ToothStatus;
  onChange?: (id: string, status: ToothStatus) => void;
  rotationDeg?: number;
  orientation?: "crown-down" | "crown-up";
  style?: React.CSSProperties;
  scale?: number;
};

export const Tooth: React.FC<ToothProps> = ({
  info,
  value = "sano",
  onChange,
  rotationDeg = 0,
  orientation = "crown-down",
  style,
  scale = 1,
}) => {
  const baseRotation = orientation === "crown-up" ? 180 : 0;
  const mirrorPart = info.mirror ? " scaleX(-1)" : "";
  const innerTransform = `translate(-50%, -50%) rotate(${baseRotation + rotationDeg}deg)${mirrorPart} scale(${scale})`;

  return (
    <ContextMenu.Root>
      <div style={{ position: "absolute", ...(style || {}) }}>
        <ContextMenu.Trigger asChild>
          <div
            className="relative select-none"
            style={{ position: "absolute", left: "50%", top: "50%", transform: innerTransform }}
          >
            <ToothSVG status={value} variant={info.variant} />
          </div>
        </ContextMenu.Trigger>

        <div
          className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-600"
          style={{
            top: orientation === "crown-down" ? "calc(50% + 48px)" : undefined,
            bottom: orientation === "crown-up" ? "calc(50% + 48px)" : undefined,
          }}
        >
          {info.id}
        </div>
      </div>

      <ContextMenu.Content className="min-w-[160px] rounded-md bg-white p-1 shadow-lg ring-1 ring-black/5 text-sm">
        {(["sano", "caries", "filled", "falta", "implante"] as ToothStatus[]).map(
          (s) => (
            <ContextMenu.Item
              key={s}
              onClick={() => onChange?.(info.id, s)}
              className={`cursor-pointer rounded px-2 py-1 hover:bg-gray-100 capitalize ${
                s === value ? "font-semibold" : ""
              }`}
            >
              {s}
            </ContextMenu.Item>
          )
        )}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};
