"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Input } from "@/components/ui";
import { Header } from "@/components/ui/atomic/layout/header";
import { Select } from "@/components/ui/controls/select";
import type { SelectOption } from "@/components/ui/controls/select";
import { Skeleton } from "@/components/ui";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import {
  useGrowthCampaignForm,
} from "@/lib/hooks/growth";
import { useGrowthSegments, useSegmentEvaluation } from "@/lib/hooks/growth";
import { useGrowthCampaignActions } from "@/lib/hooks/growth";
import { clinicTemplateService } from "@/lib/services/template/clinic-template.service";
import type { ClinicTemplate } from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/entity/growth";
import type { GrowthCampaignType } from "@/lib/entity/growth";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";

interface GrowthCampaignWizardProps {
  campaignId?: string;
}

const STEPS = [
  { title: "Información", description: "Nombre y tipo de campaña" },
  { title: "Audiencia", description: "Selecciona el segmento" },
  { title: "Mensaje", description: "Elige la plantilla" },
  { title: "Resumen", description: "Revisa antes de crear" },
  { title: "Acción", description: "Enviar o programar" },
];

export function GrowthCampaignWizard({ campaignId }: GrowthCampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { form, isEdit, handleSubmit, handleCancel } = useGrowthCampaignForm({
    campaignId,
  });

  // Segments
  const { segments, loading: segmentsLoading } = useGrowthSegments();
  const { evaluation, evaluating, evaluate } = useSegmentEvaluation();

  // Templates
  const [templates, setTemplates] = useState<ClinicTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const { acting } = useGrowthCampaignActions(() => {
    router.push("/growth/campaigns");
  });

  useEffect(() => {
    clinicTemplateService
      .getClinicTemplates()
      .then((all) => {
        // Only MARKETING templates with APPROVED meta status.
        // category is the authoritative field (from Meta sync); type is fallback.
        const marketing = all.filter(
          (t) =>
            (t.category?.toUpperCase() === "MARKETING" ||
              t.type?.toUpperCase() === "MARKETING") &&
            t.metaTemplateStatus === "APPROVED",
        );
        setTemplates(marketing);
      })
      .catch(() => {
        notify.error("No se pudieron cargar las plantillas");
      })
      .finally(() => setTemplatesLoading(false));
  }, []);

  const segmentOptions: SelectOption[] = segments.map((s) => ({
    value: s.id,
    label: s.name,
    description: s.description,
  }));

  const templateOptions: SelectOption[] = templates.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.body ? t.body.substring(0, 60) + "…" : undefined,
  }));

  const campaignTypeOptions: SelectOption[] = (
    Object.entries(CAMPAIGN_TYPE_LABELS) as [GrowthCampaignType, string][]
  ).map(([value, label]) => ({ value, label }));

  const values = form.watch();

  const selectedSegment = segments.find((s) => s.id === values.segmentId);
  const selectedTemplate = templates.find((t) => t.id === values.templateId);

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 0:
        return !!values.name?.trim() && !!values.campaignType;
      case 1:
        return !!values.segmentId;
      case 2:
        return !!values.templateId;
      default:
        return true;
    }
  }, [step, values]);

  // For step 5 submit that creates and navigates
  const handleCreate = useCallback(async () => {
    form.handleSubmit(async (vals) => {
      await handleSubmit(vals);
    })();
  }, [form, handleSubmit]);

  const handleEvaluate = useCallback(() => {
    if (values.segmentId) {
      evaluate(values.segmentId);
    }
  }, [values.segmentId, evaluate]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Header
        level={1}
        title={isEdit ? "Editar campaña" : "Nueva campaña"}
        action={
          <Button variant="ghost" onClick={handleCancel}>
            Cancelar
          </Button>
        }
      />

      {/* Step indicator */}
      <nav className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
              i === step
                ? "bg-brand/10 text-brand font-medium"
                : i < step
                  ? "text-ink cursor-pointer hover:bg-hover"
                  : "text-subtle cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                i === step
                  ? "bg-brand text-white"
                  : i < step
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : "bg-hover text-subtle",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </nav>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Step 1: Information */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Información de la campaña</CardTitle>
                <CardDescription>
                  Define el nombre y tipo de campaña.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la campaña</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ej: Promoción limpieza dental"
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
                          placeholder="Descripción breve de la campaña"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="campaignType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de campaña</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          options={campaignTypeOptions}
                          placeholder="Selecciona un tipo…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Audience */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Audiencia</CardTitle>
                <CardDescription>
                  Selecciona el segmento de pacientes para esta campaña.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {segmentsLoading ? (
                  <Skeleton className="h-12 rounded-xl" />
                ) : (
                  <FormField
                    control={form.control}
                    name="segmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            options={segmentOptions}
                            placeholder="Selecciona un segmento…"
                            searchable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {values.segmentId && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEvaluate}
                      disabled={evaluating}
                    >
                      {evaluating ? "Calculando…" : "Calcular audiencia"}
                    </Button>
                    {evaluation && (
                      <span className="text-sm text-ink">
                        <strong>{evaluation.count.toLocaleString("es")}</strong>{" "}
                        pacientes cumplen este segmento
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Message / Template */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Mensaje</CardTitle>
                <CardDescription>
                  Selecciona la plantilla de Marketing aprobada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templatesLoading ? (
                  <Skeleton className="h-12 rounded-xl" />
                ) : templateOptions.length === 0 ? (
                  <p className="text-sm text-subtle py-4">
                    No hay plantillas de Marketing aprobadas disponibles. Crea
                    una desde la sección de Configuración.
                  </p>
                ) : (
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plantilla</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            options={templateOptions}
                            placeholder="Selecciona una plantilla…"
                            searchable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {selectedTemplate?.body && (
                  <div className="rounded-xl border border-hairline bg-hover/50 p-4">
                    <p className="text-xs text-subtle mb-1">Vista previa</p>
                    <p className="text-sm text-ink whitespace-pre-wrap">
                      {selectedTemplate.body}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Summary */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
                <CardDescription>
                  Revisa los datos antes de crear la campaña.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <SummaryRow label="Nombre" value={values.name} />
                  {values.description && (
                    <SummaryRow label="Descripción" value={values.description} />
                  )}
                  <SummaryRow
                    label="Tipo"
                    value={CAMPAIGN_TYPE_LABELS[values.campaignType as GrowthCampaignType] ?? values.campaignType}
                  />
                  <SummaryRow
                    label="Segmento"
                    value={selectedSegment?.name ?? "—"}
                  />
                  {evaluation && (
                    <SummaryRow
                      label="Audiencia estimada"
                      value={`${evaluation.count.toLocaleString("es")} pacientes`}
                    />
                  )}
                  <SummaryRow
                    label="Plantilla"
                    value={selectedTemplate?.name ?? "—"}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Send / Schedule */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>¿Cuándo enviar?</CardTitle>
                <CardDescription>
                  Puedes enviar la campaña ahora o programarla para más tarde.
                  La campaña se creará en estado Borrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-subtle">
                  Primero se creará la campaña. Luego podrás enviarla o
                  programarla desde el listado de campañas.
                </p>
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de envío programado (opcional)</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          showTime
                          min={new Date().toISOString().split("T")[0]}
                          aria-label="Fecha y hora de envío programado"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-subtle">
                        Si no defines una fecha, podrás programar o enviar la campaña desde el listado.
                      </p>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => (step === 0 ? handleCancel() : setStep((s) => s - 1))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 0 ? "Cancelar" : "Anterior"}
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
              >
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={acting}
              >
                <Check className="mr-2 h-4 w-4" />
                {isEdit ? "Guardar cambios" : "Crear campaña"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
      <span className="text-sm text-subtle">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
