/**
 * Aviso de que el plan de tratamiento de un paciente se escribió desde fuera de
 * la pantalla que lo pinta (hoy, el puente del odontograma). Las pantallas del
 * plan no comparten caché: releen cuando reciben este aviso.
 */
type Listener = () => void;

const listenersByPatient = new Map<string, Set<Listener>>();

export function subscribeTreatmentPlanChanged(
  patientId: string,
  listener: Listener,
): () => void {
  const listeners = listenersByPatient.get(patientId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByPatient.set(patientId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersByPatient.delete(patientId);
  };
}

export function notifyTreatmentPlanChanged(patientId: string): void {
  listenersByPatient.get(patientId)?.forEach((listener) => listener());
}
