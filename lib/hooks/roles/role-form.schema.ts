import { z } from "zod";

import { ROLE_VALIDATION } from "@/lib/constants/roles.constants";
import { requiredText } from "@/lib/validation/fields";

/**
 * Esquema del formulario de roles (RHF + zod).
 * - `roleName`: requerido, 3–50 caracteres (alineado con ROLE_VALIDATION),
 *   compuesto desde la primitiva compartida `requiredText` (no es un nombre
 *   de persona, así que no usa `fullName`).
 * - `permissions`: lista codificada `"moduleKey-actionsValue"` (bitmask) — el
 *   contrato con el backend NO cambia; el servicio la transforma a UUIDs.
 *   Sin `min(1)`: permitir un rol sin permisos seleccionados es decisión de
 *   producto, no un vacío de validación.
 */
export const roleFormSchema = z.object({
  roleName: requiredText({
    min: ROLE_VALIDATION.MIN_NAME_LENGTH,
    max: ROLE_VALIDATION.MAX_NAME_LENGTH,
    label: "El nombre del rol",
  }),
  permissions: z.array(z.string()).default([]),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
