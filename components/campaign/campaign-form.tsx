"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {ArrowLeft, Save, Loader2} from "lucide-react";
import {TextField} from "../ui/TextField";
import {DatePickerField} from "../ui/DatePickerField";
import {FileUploadField} from "../ui/fileUpload/FileUploadField";
import useCampaignForm from "@/components/campaign/hooks/useCampaignForm";


export function CampaignForm() {
    const {
        onSubmit,
        control,
        handleSubmit,
        setValue,
        getValues,
        errors,
        isSubmitting,
        param
    } = useCampaignForm();


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => {
                    console.log("Cancel");
                }}>
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Volver
                </Button>
                <p className="text-muted-foreground">
                    {param.id ? "Edita la campaña" : "Crea una nueva campaña de marketing"}
                </p>
            </div>

            {/* Card */}
            <Card className="p-6">
                <CardHeader>
                    <CardTitle>Información de la Campaña</CardTitle>
                    <CardDescription>
                        Completa todos los campos obligatorios para{" "}
                        {param.id ? "actualizar" : "crear"} la campaña
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
                            <TextField
                                name="name"
                                control={control}
                                label="Nombre de la Campaña"
                                placeholder="Campaña por Navidad"
                                required
                                error={errors.name?.message}
                            />

                            <DatePickerField
                                name="effectiveDate"
                                control={control}
                                label="Fecha Efectiva"
                                required
                                error={errors.effectiveDate?.message}
                            />

                            <div className="md:col-span-2">
                                <TextField
                                    name="message"
                                    control={control}
                                    label="Mensaje"
                                    placeholder="Escribe el mensaje de la campaña..."
                                    required
                                    error={errors.message?.message}
                                />
                            </div>

                            <FileUploadField
                                name="fileBase64"
                                control={control}
                                label="Archivo Multimedia"
                                required
                                accept="image/*,video/*"
                                maxSize={2}
                                error={errors.fileBase64?.message}
                                onFileNameChange={(name) => {
                                    setValue("fileName", name);
                                }}
                            />
                        </div>

                        <div className="flex gap-4 pt-6">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        {param.id ? "Actualizando..." : "Guardando..."}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4"/>
                                        {param.id ? "Actualizar Campaña" : "Guardar Campaña"}
                                    </>
                                )}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => {
                                console.log(getValues());
                            }}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
