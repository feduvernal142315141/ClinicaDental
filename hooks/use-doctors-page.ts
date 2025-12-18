import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseDoctorsPageOptions {
  basePath?: string;
}

/**
 * useDoctorsPage Hook
 *
 * Manages navigation and actions for the doctors list page.
 *
 * @param options - Configuration options
 * @param options.basePath - Base path for navigation (default: "/settings/users")
 *
 * @example
 * ```tsx
 * const { handleNewDoctor } = useDoctorsPage({ basePath: "/settings/doctors" });
 * ```
 */
export function useDoctorsPage(options: UseDoctorsPageOptions = {}) {
  const { basePath = "/settings/users" } = options;
  const router = useRouter();

  /**
   * Navigate to new doctor form
   */
  const handleNewDoctor = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  /**
   * Navigate to doctor detail
   */
  const handleViewDoctor = useCallback(
    (doctorId: string) => {
      router.push(`${basePath}/${doctorId}`);
    },
    [router, basePath]
  );

  /**
   * Navigate to edit doctor
   */
  const handleEditDoctor = useCallback(
    (doctorId: string) => {
      router.push(`${basePath}/${doctorId}/edit`);
    },
    [router, basePath]
  );

  /**
   * Navigate back to list
   */
  const handleBackToList = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    handleNewDoctor,
    handleViewDoctor,
    handleEditDoctor,
    handleBackToList,
  };
}
