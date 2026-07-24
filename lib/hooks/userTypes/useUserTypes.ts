"use client";

import { useState, useCallback, useEffect } from "react";

import { userTypesService } from "@/lib/services/userTypes";
import type { UserType, CreateUserTypeDto, UpdateUserTypeDto } from "@/lib/entity/userType";
import { notify } from "@/lib/utils/notify";
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

// ── useCreateUserType ────────────────────────────────────────────────────────

export function useCreateUserType() {
  const [loading, setLoading] = useState(false);

  const createUserType = useCallback(async (data: CreateUserTypeDto): Promise<string | null> => {
    setLoading(true);
    try {
      const id = await userTypesService.createUserType(data);
      notify.success("Tipo de usuario creado", {
        description: "Ya está disponible para asignarlo al personal de la clínica.",
      });
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear el tipo de usuario";
      notify.error(msg, {
        description:
          "No pudimos crear el tipo de usuario. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createUserType, loading };
}

// ── useUpdateUserType ────────────────────────────────────────────────────────

export function useUpdateUserType(id: string) {
  const [loading, setLoading] = useState(false);

  const updateUserType = useCallback(
    async (data: UpdateUserTypeDto): Promise<boolean> => {
      setLoading(true);
      try {
        const ok = await userTypesService.updateUserType(id, data);
        notify.success("Tipo de usuario actualizado", {
          description: "Los cambios se aplicaron para todo el personal con este tipo.",
        });
        return ok;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al actualizar el tipo de usuario";
        notify.error(msg, {
          description:
            "No se guardaron los cambios. Si el mensaje indica que es el único tipo que atiende citas, activa esa opción en otro tipo antes de desactivarla aquí.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  return { updateUserType, loading };
}

// ── useArchiveUserType ───────────────────────────────────────────────────────

export function useArchiveUserType(id: string) {
  const [loading, setLoading] = useState(false);

  const archiveUserType = useCallback(
    async (onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await userTypesService.archiveUserType(id);
        notify.success("Tipo de usuario archivado", {
          description: "Ya no podrá asignarse a nuevo personal; podrás restaurarlo cuando lo necesites.",
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al archivar el tipo de usuario";
        notify.error(msg, {
          description:
            "No pudimos archivarlo. Si está asignado a personal activo o es el único que atiende citas, reasigna o crea otro tipo proveedor primero.",
        });
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  return { archiveUserType, loading };
}

// ── useUnarchiveUserType ─────────────────────────────────────────────────────

export function useUnarchiveUserType() {
  const [loading, setLoading] = useState(false);

  const unarchiveUserType = useCallback(
    async (id: string, name: string, onSuccess?: () => void): Promise<void> => {
      setLoading(true);
      try {
        await userTypesService.unarchiveUserType(id);
        notify.success("Tipo de usuario restaurado", {
          description: `"${name}" ya está disponible para asignarlo al personal.`,
        });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al restaurar el tipo de usuario";
        notify.error(msg, {
          description:
            "No pudimos restaurarlo. Puede haber otro tipo activo con el mismo nombre; renómbralo o archívalo primero.",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { unarchiveUserType, loading };
}

// ── useArchiveUserTypeWithUndo ───────────────────────────────────────────────
// Versión "fire-and-forget" con toast de Deshacer para el índice del catálogo.
// Recibe refetch a nivel de hook para que el Deshacer siga funcionando aunque la
// tarjeta que disparó la acción ya no esté montada.

export function useArchiveUserTypeWithUndo(refetch: () => void) {
  const [loading, setLoading] = useState(false);

  const archiveWithUndo = useCallback(
    async (id: string, name: string): Promise<void> => {
      setLoading(true);
      try {
        await userTypesService.archiveUserType(id);
        refetch();
        notify.action(
          `"${name}" archivado`,
          {
            title: "Deshacer",
            onClick: async () => {
              try {
                await userTypesService.unarchiveUserType(id);
                refetch();
                notify.success("Acción deshecha", {
                  description: `"${name}" vuelve a estar disponible para el personal.`,
                });
              } catch {
                notify.error("No se pudo deshacer", {
                  description: `Puedes restaurar "${name}" desde el filtro de archivados.`,
                });
              }
            },
          },
          {
            description:
              "Se ocultará para asignarlo a nuevo personal; el personal existente conserva el tipo. Podrás restaurarlo cuando quieras.",
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al archivar el tipo de usuario";
        notify.error(msg, {
          description:
            "No pudimos archivarlo. Si está asignado a personal activo o es el único que atiende citas, reasigna o crea otro tipo proveedor primero.",
        });
      } finally {
        setLoading(false);
      }
    },
    [refetch],
  );

  return { archiveWithUndo, loading };
}
