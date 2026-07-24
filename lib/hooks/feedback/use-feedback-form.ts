"use client";

import { useState, useCallback } from "react";
import { feedbackService } from "@/lib/services/feedback";
import { useFeedbackMetadata } from "./use-feedback-metadata";
import type { FeedbackType, CreateFeedbackFields } from "@/lib/entity/feedback";

interface UseFeedbackFormReturn {
  type: FeedbackType;
  setType: (t: FeedbackType) => void;
  subject: string;
  setSubject: (s: string) => void;
  description: string;
  setDescription: (d: string) => void;
  attachments: File[];
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
  submit: () => Promise<string | null>;
  reset: () => void;
}

/**
 * Hook para el formulario de creación de feedback.
 * Captura metadata automáticamente al momento del submit.
 */
export function useFeedbackForm(): UseFeedbackFormReturn {
  const { capture } = useFeedbackMetadata();

  const [type, setType] = useState<FeedbackType>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAttachment = useCallback((file: File) => {
    setAttachments((prev) => [...prev, file]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setType("bug");
    setSubject("");
    setDescription("");
    setAttachments([]);
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  }, []);

  const submit = useCallback(async (): Promise<string | null> => {
    if (!subject.trim()) {
      setError("El asunto es obligatorio");
      return null;
    }
    if (!description.trim()) {
      setError("La descripción es obligatoria");
      return null;
    }

    setSubmitting(true);
    setError(null);

    try {
      const metadata = capture();
      const request: CreateFeedbackFields = {
        subject: subject.trim(),
        description: description.trim(),
        type,
        metadata: JSON.stringify(metadata),
      };

      const result = await feedbackService.createTicket(request, attachments);
      setSubmitted(true);
      return result.ticketId;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo enviar el reporte";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [type, subject, description, attachments, capture]);

  return {
    type,
    setType,
    subject,
    setSubject,
    description,
    setDescription,
    attachments,
    addAttachment,
    removeAttachment,
    submitting,
    submitted,
    error,
    submit,
    reset,
  };
}
