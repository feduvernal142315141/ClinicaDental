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
import { useI18n } from "@/lib/contexts/i18n-context";
import {
  useGrowthSegmentForm,
  useSegmentEvaluation,
} from "@/lib/hooks/growth";
import { GrowthSegmentBuilder } from "./GrowthSegmentBuilder";

interface GrowthSegmentFormProps {
  segmentId?: string;
}

export function GrowthSegmentForm({ segmentId }: GrowthSegmentFormProps) {
  const { language, t } = useI18n();
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
                {evaluating ? t("growth.segments.calculating") : t("growth.segments.calculateAudience")}
              </Button>
              {evaluation && (
                <span className="text-sm text-ink">
                  <strong>
                    {evaluation.count.toLocaleString(language)}
                  </strong>{" "}
                  {t("growth.segments.matchesSuffix")}
                </span>
              )}
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
