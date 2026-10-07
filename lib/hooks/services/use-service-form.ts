import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useServices } from "@/lib/hooks/services/useServices";
import {
  createServiceFormSchema,
  type ServiceFormValues,
} from "@/lib/hooks/services/service-form.schema";
import type { CreateServiceRequest } from "@/lib/entity/services";
import { notify } from "@/lib/utils/notify";
import { applyServerErrorToFields } from "@/lib/validation/server-errors";
import { useI18n } from "@/lib/contexts/i18n-context";

export type { ServiceFormValues } from "@/lib/hooks/services/service-form.schema";

interface UseServiceFormParams {
  serviceId?: string;
  basePath?: string;
}

export function useServiceForm({
  serviceId,
  basePath = "/settings/services",
}: UseServiceFormParams) {
  const { t } = useI18n();
  const router = useRouter();

  const isEdit = useMemo(() => !!serviceId, [serviceId]);
  const serviceFormSchema = useMemo(() => createServiceFormSchema(t), [t]);

  const { loading, getServiceById, createService, updateService } =
    useServices();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      type: "TREATMENT",
      cost: undefined,
      duration: undefined,
      category: undefined,
      odontogramEnabled: false,
      odontogramSymbolMode: "NONE",
      symbolText: "",
      symbolImage: "",
      symbolUrl: "",
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset();

    if (!isEdit || !serviceId) return;

    getServiceById(serviceId)
      .then((service) => {
        reset({
          code: service.code,
          name: service.name,
          type: service.type,
          cost: service.cost,
          duration: service.duration ?? undefined,
          category: service.category,
          odontogramEnabled: service.odontogramEnabled,
          // MANUAL (legacy) ya no se ofrece en la UI → se normaliza a NONE para
          // que el Select no quede vacío y no se reenvíe un modo sin soporte.
          odontogramSymbolMode:
            service.odontogramSymbolMode &&
            service.odontogramSymbolMode !== "MANUAL"
              ? service.odontogramSymbolMode
              : "NONE",
          symbolText: service.symbolText ?? "",
          symbolImage: "",
          symbolUrl: service.symbolUrl ?? "",
        });
      })
      .catch((err) => {
        notify.error(err?.message || t("services.notify.formLoadError"), {
          description: t("services.notify.formLoadErrorDescription"),
        });
      });
  }, [isEdit, serviceId, getServiceById, reset, t]);

  const handleSubmit = useCallback(
    async (values: ServiceFormValues) => {
      const mode = values.odontogramEnabled
        ? values.odontogramSymbolMode
        : "NONE";

      const payload: CreateServiceRequest = {
        code: values.code,
        name: values.name,
        type: values.type,
        category: values.category,
        cost: values.cost,
        duration: values.duration,
        odontogramEnabled: values.odontogramEnabled,
        odontogramSymbolMode: mode,
        // Solo enviamos imagen nueva; si no, el backend conserva la existente.
        symbolImage: values.symbolImage || undefined,
        symbolText: mode === "TEXT" ? values.symbolText : undefined,
      };

      try {
        if (isEdit && serviceId) {
          await updateService(serviceId, payload);
        } else {
          await createService(payload);
        }
        router.push(basePath);
        router.refresh();
      } catch (error) {
        // useServices ya muestra el toast de error (incl. 409 código duplicado).
        // Además, si el mensaje real del backend cita el código enviado (ahora
        // que services.service.ts ya no lo remapea a copy genérica), marcamos
        // inline el campo Código para que el usuario vea qué corregir.
        applyServerErrorToFields(error, form.setError, [
          {
            field: "code",
            value: values.code,
            message: t("services.validation.duplicateCode"),
          },
        ]);
      }
    },
    [
      isEdit,
      serviceId,
      createService,
      updateService,
      router,
      basePath,
      form.setError,
      t,
    ],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    form,
    isEdit,
    loading,
    handleSubmit,
    handleCancel,
  };
}
