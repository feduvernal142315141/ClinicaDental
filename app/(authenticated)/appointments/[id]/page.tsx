"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppointmentDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/appointments?notice=detail_unavailable");
  }, [router]);

  return null;
}
