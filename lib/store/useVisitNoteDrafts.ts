import { create } from "zustand";

export interface VisitNoteDraft {
  html: string;
  baseUpdatedAt?: string;
  userId?: string;
}
interface VisitNoteDraftsState {
  drafts: Record<string, VisitNoteDraft>;
  setDraft: (appointmentId: string, draft: VisitNoteDraft) => void;
  getDraft: (appointmentId: string) => VisitNoteDraft | undefined;
  clearDraft: (appointmentId: string) => void;
  clearAll: () => void;
}
export const useVisitNoteDrafts = create<VisitNoteDraftsState>((set, get) => ({
  drafts: {},
  setDraft: (appointmentId, draft) =>
    set((s) => ({ drafts: { ...s.drafts, [appointmentId]: draft } })),
  getDraft: (appointmentId) => get().drafts[appointmentId],
  clearDraft: (appointmentId) =>
    set((s) => {
      if (!(appointmentId in s.drafts)) return s;
      const next = { ...s.drafts };
      delete next[appointmentId];
      return { drafts: next };
    }),
  clearAll: () =>
    set((s) => (Object.keys(s.drafts).length === 0 ? s : { drafts: {} })),
}));
