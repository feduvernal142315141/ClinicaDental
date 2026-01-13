import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseRolesPageOptions {
  basePath?: string;
}

/**
 * useRolesPage Hook
 *
 * Navigation helpers for the Roles settings module.
 */
export function useRolesPage(options: UseRolesPageOptions = {}) {
  const { basePath = "/settings/roles" } = options;
  const router = useRouter();

  const handleNewRole = useCallback(() => {
    router.push(`${basePath}/create`);
  }, [router, basePath]);

  const handleEditRole = useCallback(
    (roleId: string) => {
      router.push(`${basePath}/${roleId}/edit`);
    },
    [router, basePath]
  );

  const handleBackToList = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    handleNewRole,
    handleEditRole,
    handleBackToList,
  };
}
