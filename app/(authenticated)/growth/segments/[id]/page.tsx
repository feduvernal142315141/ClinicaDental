"use client";

import { use } from "react";
import { GrowthSegmentForm } from "@/components/features/growth/segments/GrowthSegmentForm";

interface SegmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GrowthSegmentDetailPage({ params }: SegmentDetailPageProps) {
  const { id } = use(params);
  return <GrowthSegmentForm segmentId={id} />;
}
