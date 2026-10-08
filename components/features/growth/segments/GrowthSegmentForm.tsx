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
import { ArrowLeft, Info, Save, UserSearch, Users } from "lucide-react";
import {
  SEGMENT_AUDIENCE_LABELS,
  SEGMENT_LEAD_ELIGIBILITY_HELP,
  type SegmentAudience,
} from "@/lib/entity/growth";
import { cn } from "@/lib/utils/utils";
import { AudienceBadge } from "../shared/AudienceBadge";
import { SegmentPreview } from "../shared/SegmentPreview";
import { useI18n } from "@/lib/contexts/i18n-context";
import {
  useGrowthSegmentForm,
  useSegmentEvaluation,
} from "@/lib/hooks/growth";
import { GrowthSegmentBuilder } from "./GrowthSegmentBuilder";

const AUDIENCE_OPTIONS: { value: SegmentAudience; icon: typeof Users; description: string }[] = [
  { value: "PATIENT", icon: Users, description: "Personas que ya son pacientes de la clínica." },
  { value: "LEAD", icon: UserSearch, description: "Personas interesadas que todavía no son pacientes." },
];

interface GrowthSegmentFormProps {
  segmentId?: string;
}

export function GrowthSegmentForm({ segmentId }: GrowthSegmentFormProps) {
  const { t } = useI18n();
  const {
    form,
    isEdit,
    audience,
    canChooseAudience,
    changeAudience,
    fields,
    fieldsLoading,
    fieldsError,
    conditionsError,
    handleSubmit,
    handleCancel,
  } = useGrowthSegmentForm({
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
        title={isEdit ? t("growth.segments.edit") : t("growth.segments.new")}
        action={
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("growth.actions.back")}
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("growth.form.information")}</CardTitle>
              <CardDescription>
                {t("growth.segments.infoDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("growth.form.name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("growth.segments.namePlaceholder")}
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
                    <FormLabel>{t("growth.form.descriptionOptional")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("growth.segments.descriptionPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {(canChooseAudience || audience === "LEAD") && (
            <Card>
              <CardHeader>
                <CardTitle>Audiencia</CardTitle>
                <CardDescription>
                  {isEdit
                    ? "La audiencia se elige al crear el segmento y no se puede cambiar."
                    : "A quién va dirigido el segmento. No se puede cambiar después de crearlo."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canChooseAudience ? (
                  <div role="radiogroup" aria-label="Audiencia del segmento" className="grid gap-3 sm:grid-cols-2">
                    {AUDIENCE_OPTIONS.map((option) => {
                      const selected = audience === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => changeAudience(option.value)}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                            selected ? "border-brand bg-brand/5" : "border-hairline bg-surface hover:border-foreground/15",
                          )}
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-ink">
                            <option.icon className="h-4 w-4" aria-hidden />
                            {SEGMENT_AUDIENCE_LABELS[option.value]}
                          </span>
                          <span className="mt-1 block text-xs text-subtle">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <AudienceBadge audience={audience} />
                )}
                {audience === "LEAD" && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-subtle">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {SEGMENT_LEAD_ELIGIBILITY_HELP}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <GrowthSegmentBuilder
            form={form}
            fields={fields}
            fieldsLoading={fieldsLoading}
            fieldsError={fieldsError}
            conditionsError={conditionsError}
          />

          {/* Evaluate */}
          {isEdit && segmentId && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleEvaluateInline}
                disabled={evaluating}
              >
                <Users className="mr-2 h-4 w-4" />
                {evaluating ? t("growth.segments.calculating") : t("growth.segments.calculateAudience")}
              </Button>
              {evaluation && <SegmentPreview evaluation={evaluation} audience={audience} />}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("growth.actions.cancel")}
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? t("growth.actions.saveChanges") : t("growth.segments.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
