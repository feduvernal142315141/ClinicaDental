import type { Metadata } from "next";
import { PublicDocumentSigning } from "@/components/features/documentation/public-document-signing";
export const metadata: Metadata = { title: "Firma de documento", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SigningPage() { return <PublicDocumentSigning />; }
