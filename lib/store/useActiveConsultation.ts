import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveConsultationState {
  appointmentId: string | null;
  patientId: string | null;
  patientName: string | null;
  criticalAlerts: string[];
  startTime: number | null; // Date.now() — persisted for timer continuity
}

interface ActiveConsultationActions {
  start: (data: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    criticalAlerts?: string[];
  }) => void;
  end: () => void;
  isActiveFor: (patientId: string, appointmentId: string) => boolean;
  hasAny: () => boolean;
}

export const useActiveConsultation = create<
  ActiveConsultationState & ActiveConsultationActions
>()(
  persist(
    (set, get) => ({
      appointmentId: null,
      patientId: null,
      patientName: null,
      criticalAlerts: [],
      startTime: null,

      start: (data) =>
        set({
          appointmentId: data.appointmentId,
          patientId: data.patientId,
          patientName: data.patientName,
          criticalAlerts: data.criticalAlerts ?? [],
          startTime: get().appointmentId === data.appointmentId
            ? (get().startTime ?? Date.now()) // preserve timer if same appointment
            : Date.now(),
        }),

      end: () =>
        set({
          appointmentId: null,
          patientId: null,
          patientName: null,
          criticalAlerts: [],
          startTime: null,
        }),

      isActiveFor: (patientId, appointmentId) => {
        const s = get();
        return s.patientId === patientId && s.appointmentId === appointmentId;
      },

      hasAny: () => get().appointmentId !== null,
    }),
    { name: "clinic-active-consultation" },
  ),
);
