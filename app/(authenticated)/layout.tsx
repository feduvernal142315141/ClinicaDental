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
  // El layout global está gestionado en app/layout.tsx (AppShell)
  return children;
}
