import {useAuth} from "@/contexts/auth-context";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useParams, useRouter} from "next/navigation";
import {useCallback, useEffect} from "react";
import {serviceCreateCampaign, serviceGetCampaignById, serviceUpdateCampaign} from "@/lib/services/campaigns/campaigns";
import {RequestCreateCampaign} from "@/lib/entity/campaigns/campaigns";
import moment from "moment";

type CampaignFormData = Omit<RequestCreateCampaign, 'clinicId'>;

const schema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    effectiveDate: z.string().min(1, "La fecha efectiva es obligatoria"),
    fileBase64: z.string().min(1, "El archivo es obligatorio"),
    fileName: z.string().min(1, "El nombre del archivo es obligatorio"),
    message: z.string().min(1, "El mensaje es obligatorio"),
}) satisfies z.ZodType<CampaignFormData>;


const useCampaignForm = () => {
    const {user} = useAuth();
    const param = useParams();
    const router = useRouter();

    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        reset,
        formState: {errors, isSubmitting},
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

    const getCampaign = useCallback(async (id: string) => {
        const response = await serviceGetCampaignById(id);

        if (response.status === 200) {
            const data = response.data;
            reset({
                name: data.name,
                effectiveDate: moment.utc(data.effectiveDate).format("YYYY-MM-DD"),
                fileBase64: data.resourceUrl,
                fileName: data.resourceType,
                message: data.message,
            });
        }
    }, [reset]);

    useEffect(() => {
        if (param.id) {
            getCampaign(param.id as string);
        }
    }, [param.id, getCampaign]);

    const onSubmit = useCallback(async (values: CampaignFormData) => {
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
                router.push("/campaigns");
            }
        } catch (error) {
            console.error("Error saving campaign:", error);
        }
    }, [param.id, user?.clinicId, router]);


    return {
        onSubmit,
        control,
        handleSubmit,
        setValue,
        getValues,
        errors,
        isSubmitting,
        param
    };
};

export default useCampaignForm;
