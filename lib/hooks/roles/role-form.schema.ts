import { z } from "zod";

import { ROLE_VALIDATION } from "@/lib/constants/roles.constants";

/**
 * Esquema del formulario de roles (RHF + zod).
 * - `roleName`: requerido, 3–50 caracteres (alineado con ROLE_VALIDATION).
 * - `permissions`: lista codificada `"moduleKey-actionsValue"` (bitmask) — el
 *   contrato con el backend NO cambia; el servicio la transforma a UUIDs.
 */
export const roleFormSchema = z.object({
  roleName: z
    .string()
    .trim()
    .min(1, "El nombre del rol es obligatorio")
    .min(
      ROLE_VALIDATION.MIN_NAME_LENGTH,
      `El nombre debe tener al menos ${ROLE_VALIDATION.MIN_NAME_LENGTH} caracteres`,
    )
    .max(
      ROLE_VALIDATION.MAX_NAME_LENGTH,
      `El nombre no puede exceder ${ROLE_VALIDATION.MAX_NAME_LENGTH} caracteres`,
    ),
  permissions: z.array(z.string()).default([]),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
