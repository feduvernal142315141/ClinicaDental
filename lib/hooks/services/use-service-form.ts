import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useServices } from "@/lib/hooks/services/useServices";
import {
  createServiceFormSchema,
  type ServiceFormValues,
} from "@/lib/hooks/services/service-form.schema";
import {
  assistantToggleBlock,
  buildAssistantProfile,
  canOfferToAssistant,
  isAssistantProfileChanged,
  type CreateServiceRequest,
} from "@/lib/entity/services";
import { servicesService } from "@/lib/services/services";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { notify } from "@/lib/utils/notify";
import { applyServerErrorToFields } from "@/lib/validation/server-errors";
import { useI18n } from "@/lib/contexts/i18n-context";

export type { ServiceFormValues } from "@/lib/hooks/services/service-form.schema";

interface UseServiceFormParams {
  serviceId?: string;
  basePath?: string;
}

/** Perfil del asistente tal como está guardado (para saber si la sección cambió). */
interface SavedAssistantProfile {
  assistantVisible: boolean;
  assistantDescription: string | null;
}

const EMPTY_ASSISTANT_PROFILE: SavedAssistantProfile = {
  assistantVisible: false,
  assistantDescription: null,
};

/** El servicio ya se guardó; falta (o falló) guardar lo del asistente. */
interface AssistantSaveFailure {
  serviceId: string;
  /** `message` del backend, listo para mostrar; vacío si ya se muestra junto al campo. */
  message: string;
}

export function useServiceForm({
  serviceId,
  basePath = "/settings/services",
}: UseServiceFormParams) {
  const { t } = useI18n();
  const router = useRouter();
  const { can, isAdmin } = usePermission();

  const isEdit = useMemo(() => !!serviceId, [serviceId]);
  const serviceFormSchema = useMemo(() => createServiceFormSchema(t), [t]);

  const { loading, getServiceById, createService, updateService } =
    useServices();

  const savedAssistant = useRef<SavedAssistantProfile>(EMPTY_ASSISTANT_PROFILE);
  // Un servicio inactivo nunca se menciona; uno nuevo nace activo.
  const [serviceActive, setServiceActive] = useState(true);
  const [assistantFailure, setAssistantFailure] =
    useState<AssistantSaveFailure | null>(null);
  const [savingAssistant, setSavingAssistant] = useState(false);
  // El backend respondió 403 al guardar el perfil: la sección pasa a solo lectura.
  const [assistantForbidden, setAssistantForbidden] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      type: "TREATMENT",
      cost: undefined,
      duration: undefined,
      documentationTemplateId: "",
      documentSignatureRequired: false,
      category: undefined,
      odontogramEnabled: false,
      odontogramSymbolMode: "NONE",
      symbolText: "",
      symbolImage: "",
      symbolUrl: "",
      assistantVisible: false,
      assistantDescription: "",
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset();
    savedAssistant.current = EMPTY_ASSISTANT_PROFILE;
    setServiceActive(true);
    setAssistantFailure(null);

    if (!isEdit || !serviceId) return;

    getServiceById(serviceId)
      .then((service) => {
        savedAssistant.current = {
          assistantVisible: service.assistantVisible === true,
          assistantDescription: service.assistantDescription ?? null,
        };
        setServiceActive(service.active !== false);
        reset({
          code: service.code,
          name: service.name,
          type: service.type,
          cost: service.cost,
          duration: service.duration ?? undefined,
          documentationTemplateId: service.documentationTemplateId ?? "",
          documentSignatureRequired: service.documentSignatureRequired ?? false,
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
          assistantVisible: service.assistantVisible === true,
          assistantDescription: service.assistantDescription ?? "",
        });
      })
      .catch((err) => {
        notify.error(err?.message || t("services.notify.formLoadError"), {
          description: t("services.notify.formLoadErrorDescription"),
        });
      });
  }, [isEdit, serviceId, getServiceById, reset, t]);

  // Cambiar el tipo a Producto o Anticipo con el interruptor encendido lo apaga y avisa.
  const type = form.watch("type");
  const assistantVisible = form.watch("assistantVisible");
  useEffect(() => {
    if (!assistantVisible || canOfferToAssistant(type)) return;
    form.setValue("assistantVisible", false, { shouldDirty: true });
    notify.warning(t("services.notify.assistantTurnedOff"), {
      description: t("services.assistant.typeNotAllowed"),
    });
  }, [type, assistantVisible, form, t]);

  const canEditAssistant =
    (isAdmin || can("service", PermissionAction.EDIT)) && !assistantForbidden;
  const assistantBlock = assistantToggleBlock({ type, active: serviceActive });

  const leave = useCallback(() => {
    router.push(basePath);
    router.refresh();
  }, [router, basePath]);

  /**
   * Paso 2: guarda lo del asistente con su propio endpoint. Devuelve `true` si
   * quedó guardado (o si no había nada que guardar).
   */
  const saveAssistantProfile = useCallback(
    async (id: string, values: ServiceFormValues): Promise<boolean> => {
      const next = {
        assistantVisible: values.assistantVisible,
        assistantDescription: values.assistantDescription,
      };
      if (
        !canEditAssistant ||
        !isAssistantProfileChanged(savedAssistant.current, next)
      ) {
        setAssistantFailure(null);
        return true;
      }

      setSavingAssistant(true);
      try {
        const profile = buildAssistantProfile(
          next.assistantVisible,
          next.assistantDescription,
        );
        const visible = await servicesService.setAssistantProfile(id, profile);
        savedAssistant.current = {
          assistantVisible: visible,
          assistantDescription: profile.assistantDescription,
        };
        setAssistantFailure(null);
        return true;
      } catch (error) {
        const status = (error as { status?: number } | null)?.status;
        const message =
          error instanceof Error && error.message
            ? error.message
            : t("services.notify.assistantError");
        // 400: el tipo no puede mostrarse → el interruptor vuelve a apagado.
        if (status === 400) {
          form.setValue("assistantVisible", false, { shouldDirty: true });
        }
        // 422: descripción inválida → el mensaje va junto al campo.
        if (status === 422) {
          form.setError("assistantDescription", { type: "server", message });
        }
        if (status === 403) setAssistantForbidden(true);
        // En un 422 el mensaje ya está junto al campo: el aviso no lo repite.
        setAssistantFailure({
          serviceId: id,
          message: status === 422 ? "" : message,
        });
        return false;
      } finally {
        setSavingAssistant(false);
      }
    },
    [canEditAssistant, form, t],
  );

  const handleSubmit = useCallback(
    async (values: ServiceFormValues) => {
      // Al crear, el servicio ya se guardó en un intento anterior: solo falta el
      // paso 2 (repetir el POST lo duplicaría). Al editar se repite el flujo
      // completo: el PUT es idempotente y recoge cualquier otro cambio.
      if (assistantFailure && !isEdit) {
        if (await saveAssistantProfile(assistantFailure.serviceId, values)) {
          leave();
        }
        return;
      }

      const mode = values.odontogramEnabled
        ? values.odontogramSymbolMode
        : "NONE";

      // Sin `assistantVisible` ni `assistantDescription`: POST/PUT /services no
      // los reciben.
      const payload: CreateServiceRequest = {
        code: values.code,
        name: values.name,
        type: values.type,
        category: values.category,
        cost: values.cost,
        duration: values.duration,
        documentationTemplateId: values.documentationTemplateId || null,
        documentSignatureRequired: !!values.documentationTemplateId && !!values.documentSignatureRequired,
        odontogramEnabled: values.odontogramEnabled,
        odontogramSymbolMode: mode,
        // Solo enviamos imagen nueva; si no, el backend conserva la existente.
        symbolImage: values.symbolImage || undefined,
        symbolText: mode === "TEXT" ? values.symbolText : undefined,
      };

      let savedId: string | undefined;
      try {
        if (isEdit && serviceId) {
          await updateService(serviceId, payload);
          savedId = serviceId;
        } else {
          const created = await createService(payload);
          // Al crear, el POST devuelve el id del servicio.
          savedId = typeof created === "string" ? created : undefined;
        }
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
        return;
      }

      if (!savedId) {
        // Sin id no hay dónde guardar el perfil: solo es un problema si cambió.
        if (
          canEditAssistant &&
          isAssistantProfileChanged(savedAssistant.current, values)
        ) {
          notify.warning(t("services.form.assistantSaveFailed"));
        }
        leave();
        return;
      }

      if (await saveAssistantProfile(savedId, values)) leave();
    },
    [
      assistantFailure,
      saveAssistantProfile,
      leave,
      isEdit,
      serviceId,
      createService,
      updateService,
      canEditAssistant,
      form.setError,
      t,
    ],
  );

  /** Reintenta solo el paso 2 con lo que hay ahora en la sección del asistente. */
  const retryAssistant = useCallback(async () => {
    if (!assistantFailure) return;
    const valid = await form.trigger([
      "assistantVisible",
      "assistantDescription",
    ]);
    if (!valid) return;
    if (
      await saveAssistantProfile(assistantFailure.serviceId, form.getValues())
    ) {
      leave();
    }
  }, [assistantFailure, form, saveAssistantProfile, leave]);

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    form,
    isEdit,
    loading: loading || savingAssistant,
    handleSubmit,
    handleCancel,
    assistant: {
      canEdit: canEditAssistant,
      forbidden: assistantForbidden,
      block: assistantBlock,
      failure: assistantFailure,
      /** Al crear, el servicio ya existe y solo falta guardar el perfil: el resto del formulario se bloquea. */
      onlyProfilePending: !!assistantFailure && !isEdit,
      saving: savingAssistant,
      retry: retryAssistant,
    },
  };
}
