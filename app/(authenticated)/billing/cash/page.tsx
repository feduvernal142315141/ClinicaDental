"use client";

import { useSearchParams } from "next/navigation";
import { CashPage } from "@/components/features/billing/cash/CashPage";

export default function BillingCashPage() {
  const params = useSearchParams();
  return <CashPage openOnLoad={params.get("open") === "1"} />;
}
