"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from "@/components/ui";
import { reasonSchema } from "@/lib/entity/billing/schemas";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";

const formSchema = z.object({ reason: reasonSchema });
type FormValues = z.infer<typeof formSchema>;

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Debe lanzar el error del backend para que se muestre dentro del modal. */
  onConfirm: (reason: string) => Promise<void>;
  /** Acción sugerida junto al error (p. ej. "Ir a los pagos", "Devolver"). */
  renderErrorAction?: (error: unknown) => React.ReactNode;
  destructive?: boolean;
}

/** Modal de motivo (5 a 500 caracteres) para anular y descartar. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  renderErrorAction,
  destructive = true,
}: ReasonDialogProps) {
  const [error, setError] = useState<unknown>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: "" });
      setError(null);
    }
  }, [open, form]);

  const submit = form.handleSubmit(async ({ reason }) => {
    setError(null);
    try {
      await onConfirm(reason);
      onOpenChange(false);
    } catch (err) {
      if (!isModuleDisabledError(err)) setError(err);
    }
  });

  const submitting = form.formState.isSubmitting;
  const reasonLength = form.watch("reason").length;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="rounded-bento border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">{title}</DialogTitle>
          <DialogDescription className="text-subtle">{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={500} placeholder="Explica brevemente el motivo" />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <span className="ml-auto text-xs tabular-nums text-subtle">{reasonLength}/500</span>
                  </div>
                </FormItem>
              )}
            />
            {error !== null && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>{billingErrorMessage(error)}</p>
                  {renderErrorAction?.(error)}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
