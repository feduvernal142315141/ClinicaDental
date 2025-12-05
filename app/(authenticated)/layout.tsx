import { AuthenticatedLayoutClient } from "@/components/layout/authenticated-layout-client";

/**
 * AUTHENTICATED LAYOUT (SERVER COMPONENT)
 *
 * Server Component que wrappea todos los children
 * Delega pathname tracking al Client Component
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayoutClient>{children}</AuthenticatedLayoutClient>;
}
