"use client";

import { Suspense } from "react";
import { LeadsPage } from "@/components/features/leads/LeadsPage";

export default function LeadsRoute() {
  return (
    <Suspense fallback={null}>
      <LeadsPage />
    </Suspense>
  );
}
