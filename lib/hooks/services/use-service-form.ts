import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useServices } from "@/lib/hooks/services/useServices";
import {
  serviceFormSchema,
  type ServiceFormValues,
} from "@/lib/hooks/services/service-form.schema";
import type { CreateServiceRequest } from "@/lib/entity/services";
import { notify } from "@/lib/utils/notify";

export type { ServiceFormValues } from "@/lib/hooks/services/service-form.schema";

interface UseServiceFormParams {
  serviceId?: string;
  basePath?: string;
}

export function useServiceForm({
  serviceId,
  basePath = "/settings/services",
}: UseServiceFormParams) {
  const router = useRouter();

  const isEdit = useMemo(() => !!serviceId, [serviceId]);

  const { loading, getServiceById, createService, updateService } =
    useServices();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      type: "TREATMENT",
      cost: 0,
      duration: undefined,
      category: undefined,
      description: "",
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
          description: service.description ?? "",
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
        notify.error(err?.message || "Error al cargar servicio");
      });
  }, [isEdit, serviceId, getServiceById, reset]);

  const handleSubmit = useCallback(
    async (values: ServiceFormValues) => {
      const mode = values.odontogramEnabled
        ? values.odontogramSymbolMode
        : "NONE";

      const payload: CreateServiceRequest = {
        code: values.code,
        name: values.name,
        description: values.description || undefined,
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
      } catch {
        // useServices ya muestra el toast de error (incl. 409 código duplicado).
      }
    },
    [isEdit, serviceId, createService, updateService, router, basePath],
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
