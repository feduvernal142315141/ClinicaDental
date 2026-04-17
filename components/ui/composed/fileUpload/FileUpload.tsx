"use client";

import * as React from "react";
import {Upload, X, FileIcon, ImageIcon} from "lucide-react";
import {Button} from "@/components/ui/primitives/shadcn/button";
import {cn} from "@/lib/utils/utils";

interface FileUploadProps {
    onFileSelect: (file: File, base64: string) => void;
    onFileRemove?: () => void;
    accept?: string;
    maxSize?: number; // en MB
    className?: string;
    preview?: string | null;
}

export function FileUpload({
                               onFileSelect,
                               onFileRemove,
                               accept = "image/*,video/*,.pdf,.doc,.docx",
                               maxSize = 10, // 10MB por defecto
                               className,
                               preview,
                           }: FileUploadProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(preview || null);
    const [fileName, setFileName] = React.useState<string>("");
    const [fileType, setFileType] = React.useState<string>("");
    const [error, setError] = React.useState<string>("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    console.log(preview, "PREVIEW");

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // Validar si el archivo es del tipo permitido
    const isFileTypeAccepted = (file: File): boolean => {
        if (!accept) return true;

        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        return acceptedTypes.some((acceptedType) => {
            if (acceptedType.startsWith(".")) {
                return fileName.endsWith(acceptedType.toLowerCase());
            }

            if (acceptedType.endsWith("/*")) {
                const baseType = acceptedType.replace("/*", "");
                return fileType.startsWith(baseType);
            }

            return fileType === acceptedType;
        });
    };

    const handleFile = async (file: File) => {

        setError("");

        if (!isFileTypeAccepted(file)) {
            const errorMsg = `Tipo de archivo no permitido. Solo se aceptan: ${accept}`;
            setError(errorMsg);
            setTimeout(() => setError(""), 5000);
            return;
        }

        // Validar tamaño
        if (file.size > maxSize * 1024 * 1024) {
            const errorMsg = `El archivo es demasiado grande. Máximo ${maxSize}MB`;
            setError(errorMsg);
            setTimeout(() => setError(""), 5000);
            return;
        }

        // Convertir a base64
        try {
            const base64 = await convertToBase64(file);

            // Guardar información del archivo
            setFileName(file.name);
            setFileType(file.type);

            // Si es imagen, mostrar preview
            if (file.type.startsWith("image/")) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }

            // Llamar callback con el archivo y base64
            onFileSelect(file, base64);
        } catch (error) {
            console.error("Error converting file to base64:", error);
            alert("Error al procesar el archivo");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(null);
        setFileName("");
        setFileType("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onFileRemove?.();
    };

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    // Actualizar preview cuando cambia la prop
    React.useEffect(() => {
        if (preview) {
            setPreviewUrl(preview);
        }
    }, [preview]);

    return (
        <div className={cn("w-full", className)}>
            {/* Mensaje de error */}
            {error && (
                <div
                    className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {!previewUrl && !fileName ? (
                // Zona de carga
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "relative rounded-xl border-2 border-dashed transition-all duration-200",
                        isDragging
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-gray-300 bg-white dark:bg-gray-900 hover:border-gray-400",
                        error && "border-red-300 bg-red-50/50 dark:bg-red-900/10",
                        "p-8 text-center cursor-pointer"
                    )}
                    onClick={handleBrowse}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
                            <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400"/>
                        </div>

                        <div className="space-y-2">
                            <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                                Drag your documents, photos, or videos here to start uploading.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">OR</p>
                        </div>

                        <Button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBrowse();
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Browse files
                        </Button>

                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Máximo {maxSize}MB
                        </p>
                    </div>
                </div>
            ) : (
                // Vista previa
                <div
                    className="relative rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-red-50 hover:text-red-600"
                    >
                        <X className="h-4 w-4"/>
                    </Button>

                    {previewUrl && (fileType.startsWith("image/") || previewUrl.startsWith("https://")) ? (
                        // Preview de imagen
                        <div className="space-y-3">
                            <div
                                className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            {fileName && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <ImageIcon className="h-4 w-4"/>
                                    <span className="truncate">{fileName}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Preview de archivo no imagen
                        <div className="flex items-center gap-4 p-4">
                            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-3">
                                <FileIcon className="h-8 w-8 text-blue-600 dark:text-blue-400"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {fileName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {fileType || "Archivo cargado"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

