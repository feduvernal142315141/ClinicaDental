import type { StatusBadgeTone } from "@/components/ui";
import type { PatientRiskLevel } from "@/lib/odontogram/domain/odontogram/types";

/**
 * Traducción del riesgo de caries del paciente (CAMBRA) al tono del pill
 * de estado del sistema.
 *
 * Sustituye a las tres funciones `getRiskColor` duplicadas de las pestañas
 * (diagnóstico, plan y realizados), que producían tres aspectos distintos
 * — `border-…`, `ring-…` o ninguno — para exactamente el mismo dato.
 *
 * Vive aquí, en `components/features/odontogram/ui/`, y no en
 * `lib/odontogram/*`: el dominio no puede importar `@/components/ui`.
 *
 * @example
 * import { StatusBadge } from "@/components/ui";
 * import { RISK_TONE } from "@/components/features/odontogram/ui";
 *
 * <StatusBadge
 *   tone={RISK_TONE[patientRisk]}
 *   title={patientRiskReasons?.join(" · ")}
 * >
 *   Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
 * </StatusBadge>
 */
export const RISK_TONE: Record<PatientRiskLevel, StatusBadgeTone> = {
  bajo: "success",
  medio: "warning",
  alto: "danger",
};
