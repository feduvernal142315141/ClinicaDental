import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UsePatientsPageOptions {
  basePath?: string;
}

/**
 * usePatientsPage Hook
 *
 * Manages navigation and actions for the patients pages.
 *
 * @param options - Configuration options
 * @param options.basePath - Base path for navigation (default: "/patients")
 *
 * @example
 * ```tsx
 * const { handleNewPatient } = usePatientsPage({ basePath: "/patients" });
 * ```
 */
export function usePatientsPage(options: UsePatientsPageOptions = {}) {
  const { basePath = "/patients" } = options;
  const router = useRouter();

  /**
   * Navigate to new patient form
   */
  const handleNewPatient = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  /**
   * Navigate to patient detail
   */
  const handleViewPatient = useCallback(
    (patientId: string) => {
      router.push(`${basePath}/${patientId}`);
    },
    [router, basePath]
  );

  /**
   * Navigate to edit patient
   */
  const handleEditPatient = useCallback(
    (patientId: string) => {
      router.push(`${basePath}/${patientId}/edit`);
    },
    [router, basePath]
  );

  /**
   * Navigate back to list
   */
  const handleBackToList = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  /**
   * Navigate back to patient detail
   */
  const handleBackToDetail = useCallback(
    (patientId: string) => {
      router.push(`${basePath}/${patientId}`);
    },
    [router, basePath]
  );

  return {
    handleNewPatient,
    handleViewPatient,
    handleEditPatient,
    handleBackToList,
    handleBackToDetail,
  };
}
