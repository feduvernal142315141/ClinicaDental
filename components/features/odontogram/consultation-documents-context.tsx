"use client";
import { createContext, useContext } from "react";
export const ConsultationDocumentsContext = createContext<{ stage: (ids: string[]) => Promise<boolean>; busy: boolean } | null>(null);
export const useConsultationDocuments = () => useContext(ConsultationDocumentsContext);
