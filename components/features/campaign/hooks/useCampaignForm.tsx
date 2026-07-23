import { useAuth } from "@/lib/contexts/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { requiredText } from "@/lib/validation/fields";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  serviceCreateCampaign,
  serviceGetCampaignById,
  serviceUpdateCampaign,
} from "@/lib/services/campaigns/campaigns";
import { RequestCreateCampaign } from "@/lib/entity/campaigns/campaigns";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import moment from "moment";

type CampaignFormData = Omit<RequestCreateCampaign, "clinicId">;

const schema = z.object({
  name: requiredText({ min: 1, label: "El nombre" }),
  effectiveDate: z.string().min(1, "La fecha efectiva es obligatoria"),
  fileBase64: z.string().min(1, "El archivo es obligatorio"),
  fileName: z.string().min(1, "El nombre del archivo es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio"),
}) satisfies z.ZodType<CampaignFormData>;

const useCampaignForm = () => {
  const { user } = useAuth();
  const param = useParams();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      effectiveDate: "",
      fileBase64: "",
      fileName: "",
      message: "",
    },
  });

  const getCampaign = useCallback(
    async (id: string) => {
      try {
        const response = await serviceGetCampaignById(id);

        if (response?.status === 200) {
          const data = response.data;
          reset({
            name: data.name,
            effectiveDate: moment.utc(data.effectiveDate).format("YYYY-MM-DD"),
            fileBase64: data.resourceUrl,
            fileName: data.resourceType,
            message: data.message,
          });
        } else {
          // baseService resuelve con la respuesta de error en vez de lanzar
          notifyApiError("No se pudo cargar la campaña", { response });
        }
      } catch (error) {
        notifyApiError("No se pudo cargar la campaña", error);
      }
    },
    [reset]
  );

  useEffect(() => {
    if (param.id) {
      getCampaign(param.id as string);
    }
  }, [param.id, getCampaign]);

  const onSubmit = useCallback(
    async (values: CampaignFormData) => {
      try {
        const id = Array.isArray(param.id) ? param.id[0] : param.id;
        let response;

        if (id) {
          response = await serviceUpdateCampaign({
            ...values,
            id: id ?? "",
          });
        } else {
          response = await serviceCreateCampaign({
            ...values,
            clinicId: user?.clinicId ?? "",
          });
        }

        if (response?.status === 201) {
          if (id) {
            notify.success("Campaña actualizada", {
              description:
                "Los cambios de la campaña se guardaron y ya están disponibles en el listado.",
            });
          } else {
            notify.success("Campaña creada", {
              description:
                "La campaña ya aparece en el listado y puedes activarla o editarla cuando quieras.",
            });
          }
          router.push("/campaigns");
        } else {
          // baseService resuelve con la respuesta de error en vez de lanzar
          notifyApiError("No se pudo guardar la campaña", { response });
        }
      } catch (error) {
        notifyApiError("No se pudo guardar la campaña", error);
      }
    },
    [param.id, user?.clinicId, router]
  );

  return {
    onSubmit,
    control,
    handleSubmit,
    setValue,
    getValues,
    errors,
    isSubmitting,
    param,
  };
};

export default useCampaignForm;
