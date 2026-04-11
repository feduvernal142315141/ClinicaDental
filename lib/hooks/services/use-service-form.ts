import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Form } from "antd";
import type { UploadFile } from "antd";
import { useRouter } from "next/navigation";
import { useServices } from "@/lib/hooks/services/useServices";
import type {
  CreateServiceRequest,
  OdontogramSymbolMode,
  ServiceType,
  ServiceCategory,
} from "@/lib/entity/services";

interface UseServiceFormParams {
  serviceId?: string;
  basePath?: string;
}

export type ServiceFormValues = {
  code: string;
  name: string;
  description?: string;
  type: ServiceType;
  category?: ServiceCategory;
  cost: number;
  odontogramEnabled: boolean;
  odontogramSymbolMode: OdontogramSymbolMode;
  symbolText?: string;
};

export function useServiceForm({
  serviceId,
  basePath = "/settings/services",
}: UseServiceFormParams) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<ServiceFormValues>();

  const isEdit = useMemo(() => !!serviceId, [serviceId]);

  const { loading, getServiceById, createService, updateService } =
    useServices();

  const [symbolFileList, setSymbolFileList] = useState<UploadFile[]>([]);
  const [symbolImage, setSymbolImage] = useState<string | undefined>();

  const handleSymbolFileChange = useCallback((files: UploadFile[]) => {
    setSymbolFileList(files);
    if (files.length > 0 && files[0].originFileObj) {
      const reader = new FileReader();
      reader.readAsDataURL(files[0].originFileObj);
      reader.onload = () => setSymbolImage(reader.result as string);
    } else {
      setSymbolImage(undefined);
    }
  }, []);

  useEffect(() => {
    form.resetFields();

    if (!isEdit || !serviceId) return;

    getServiceById(serviceId)
      .then((service) => {
        form.setFieldsValue({
          code: service.code,
          name: service.name,
          description: service.description,
          type: service.type,
          category: service.category,
          cost: service.cost,
          odontogramEnabled: service.odontogramEnabled,
          odontogramSymbolMode: service.odontogramSymbolMode,
          symbolText: service.symbolText,
        });
        if (service.symbolUrl) {
          setSymbolFileList([
            {
              uid: "-1",
              name: "symbol",
              status: "done" as const,
              url: service.symbolUrl,
            },
          ]);
        }
      })
      .catch((err) => {
        message.error(err?.message || "Error al cargar servicio");
      });
  }, [isEdit, serviceId, getServiceById, form, message]);

  const handleSubmit = useCallback(
    async (values: ServiceFormValues) => {
      const mode = values.odontogramEnabled
        ? values.odontogramSymbolMode
        : "NONE";

      if (mode === "ASSET" && !symbolImage && symbolFileList.length === 0) {
        message.error("Debe subir una imagen para el símbolo");
        return;
      }

      const payload: CreateServiceRequest = {
        code: values.code,
        name: values.name,
        description: values.description,
        type: values.type,
        category: values.category,
        cost: values.cost,
        odontogramEnabled: values.odontogramEnabled,
        odontogramSymbolMode: mode,
        symbolImage: symbolImage || undefined,
        symbolText: values.symbolText,
      };

      if (isEdit && serviceId) {
        await updateService(serviceId, payload);
      } else {
        await createService(payload);
      }

      router.push(basePath);
      router.refresh();
    },
    [
      isEdit,
      serviceId,
      createService,
      updateService,
      router,
      basePath,
      symbolImage,
      symbolFileList,
      message,
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
    symbolFileList,
    handleSymbolFileChange,
  };
}
