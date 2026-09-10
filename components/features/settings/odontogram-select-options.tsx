"use client";

import * as React from "react";

import type { SelectOption } from "@/components/ui/controls/select";
import { TOOTH_NOTATION_CATALOG } from "@/lib/entity/settings/tooth-notations";
import { ToothNotationLabel } from "@/lib/odontogram/notation";

const SAMPLE_FDI = 16;

function NotationSample({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-8 justify-center text-sm font-semibold tabular-nums text-ink">
      {children}
    </span>
  );
}

export const TOOTH_NOTATION_SELECT_OPTIONS: readonly SelectOption[] =
  TOOTH_NOTATION_CATALOG.map((n) => ({
    value: n.value,
    label: n.label,
    searchText: n.searchText,
    description: n.description,
    icon: (
      <NotationSample>
        <ToothNotationLabel fdi={SAMPLE_FDI} notation={n.value} />
      </NotationSample>
    ),
  }));
