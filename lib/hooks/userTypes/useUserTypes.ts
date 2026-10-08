"use client";

import { useState, useCallback, useEffect } from "react";

import { userTypesService } from "@/lib/services/userTypes";
import type { UserType } from "@/lib/entity/userType";
import { notifyApiError } from "@/lib/utils/notify-error";

// ── useUserTypes ─────────────────────────────────────────────────────────────

export function useUserTypes(includeArchived = false) {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userTypesService.getUserTypes(includeArchived);
      setUserTypes(data);
    } catch (error) {
      notifyApiError("No se pudieron cargar los tipos de usuario", error);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchUserTypes();
  }, [fetchUserTypes]);

  return { userTypes, loading, refetch: fetchUserTypes };
}
