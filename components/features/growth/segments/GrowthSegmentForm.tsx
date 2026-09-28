"use client";

import { useCallback } from "react";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Input } from "@/components/ui";
import { ArrowLeft, Save, Users } from "lucide-react";
import {
  useGrowthSegmentForm,
  useSegmentEvaluation,
} from "@/lib/hooks/growth";
import { GrowthSegmentBuilder } from "./GrowthSegmentBuilder";

interface GrowthSegmentFormProps {
  segmentId?: string;
}

export function GrowthSegmentForm({ segmentId }: GrowthSegmentFormProps) {
  const { form, isEdit, handleSubmit, handleCancel } = useGrowthSegmentForm({
    segmentId,
  });
  const { evaluation, evaluating, evaluate } = useSegmentEvaluation();

  const handleEvaluateInline = useCallback(() => {
    if (segmentId) {
      evaluate(segmentId);
    }
  }, [segmentId, evaluate]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Header
        level={1}
        title={isEdit ? "Editar segmento" : "Nuevo segmento"}
        action={
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
              <CardDescription>
                Nombre y descripción del segmento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ej: Pacientes sin cita hace 6 meses"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Descripción breve del segmento"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <GrowthSegmentBuilder form={form} />

          {/* Evaluate */}
          {isEdit && segmentId && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleEvaluateInline}
                disabled={evaluating}
              >
                <Users className="mr-2 h-4 w-4" />
                {evaluating ? "Calculando…" : "Calcular audiencia"}
              </Button>
              {evaluation && (
                <span className="text-sm text-ink">
                  <strong>
                    {evaluation.count.toLocaleString("es")}
                  </strong>{" "}
                  pacientes cumplen este segmento
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? "Guardar cambios" : "Crear segmento"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
