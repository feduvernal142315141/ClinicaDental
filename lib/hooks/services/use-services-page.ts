import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseServicesPageOptions {
  basePath?: string;
}

/**
 * useServicesPage Hook
 *
 * Navigation helpers for the Services settings module.
 */
export function useServicesPage(options: UseServicesPageOptions = {}) {
  const { basePath = "/settings/services" } = options;
  const router = useRouter();

  const handleNewService = useCallback(() => {
    router.push(`${basePath}/create`);
  }, [router, basePath]);

  const handleEditService = useCallback(
    (serviceId: string) => {
      router.push(`${basePath}/${serviceId}/edit`);
    },
    [router, basePath],
  );

  const handleBackToList = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    handleNewService,
    handleEditService,
    handleBackToList,
  };
}
