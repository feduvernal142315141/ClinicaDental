"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { Plus, Smartphone } from "lucide-react";
import { Controller } from "react-hook-form";
import { Combobox } from "@/components/ui/primitives/shadcn/combobox";
import useTemplateForm from "@/components/template/hooks/useTemplateForm";
import { TextField } from "@/components/ui/primitives/custom/TextField";

export function TemplateForm() {
  const {
    bodyText,
    variablesText,
    variablesMedia,
    mediaVariable2,
    placeholderError,
    typeOptions,
    selectedType,
    control,
    errors,
    addVariable,
    updateVariableSample,
    updateVariableMediaSample,
    handleUpdateBodyText,
    replaceVariablesWithSamples,
  } = useTemplateForm();

  return (
    <div className="w-full">
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            noValidate
            className="grid grid-cols-4 gap-x-20 gap-y-8"
          >
            <div className={"col-span-1"}>
              <Label htmlFor="template-type" className="text-base mb-2 block">
                Tipo de Plantilla
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={typeOptions.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Seleccionar tipo..."
                    searchPlaceholder="Buscar tipo..."
                    emptyText="No se encontraron tipos."
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <TextField
                name="name"
                control={control}
                label="Mensaje"
                placeholder="Escribe el nombre de la plantilla..."
                required
                error={errors.name?.message}
              />
            </div>
            <div className={"col-span-4 grid grid-cols-2"}>
              <div className="space-y-6 col-span-1">
                <h2 className="text-xl font-semibold">
                  Configurar contenido - Texto
                </h2>

                {/* Body Field */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="text-body" className="text-base">
                      Body
                    </Label>
                    <span className="text-destructive">*</span>
                  </div>
                  <TextArea
                    id="text-body"
                    value={bodyText}
                    onChange={handleUpdateBodyText}
                    rows={4}
                    placeholder="Escribe tu mensaje aquí..."
                    className="resize-none"
                  />
                  {placeholderError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <span>⚠️</span> {placeholderError}
                    </p>
                  )}
                  <div className="flex justify-end text-sm text-muted-foreground">
                    {bodyText.length}/1600
                  </div>
                </div>

                {/* Variables Section */}
                {variablesText.map((variable) => (
                  <div key={variable.id} className="space-y-2">
                    <Label htmlFor={`variable-${variable.id}`}>
                      Contenido de muestra para la variable{" "}
                      {variable.placeholder}
                    </Label>
                    <Input
                      id={`variable-${variable.id}`}
                      placeholder={`le enviamos nuestras nuevas promociones por este mes`}
                      value={variable.sampleContent}
                      onChange={(e) =>
                        updateVariableSample(variable.id, e.target.value)
                      }
                    />
                  </div>
                ))}

                {/* Add Variable Button */}
                <Button
                  variant="ghost"
                  onClick={addVariable}
                  className="text-brand hover:text-brand-strong"
                  type={"button"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Variable
                </Button>

                {selectedType === "media" && (
                  <>
                    {variablesMedia.map((variable) => (
                      <div key={variable.id} className="space-y-2">
                        <Label htmlFor={`variable-${variable.id}`}>
                          Contenido de muestra para la imagen/video
                        </Label>
                        <Input
                          id={`variable-${variable.id}`}
                          placeholder={`https://`}
                          value={variable.sampleContent}
                          onChange={(e) =>
                            updateVariableMediaSample(
                              variable.id,
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="space-y-4 col-span-1">
                <div className="flex items-center justify-center">
                  <h3 className="text-2xl font-semibold">Vista Previa</h3>
                  {/* <Info className="h-5 w-5 text-muted-foreground" /> */}
                </div>

                {/* Phone Preview */}
                <div className="relative mx-auto max-w-sm">
                  {/* Left Side Buttons - Volume (Outside frame) */}
                  <div className="absolute left-0 top-28 -translate-x-full space-y-4 z-10">
                    <div className="w-[4px] h-14 bg-gray-800 rounded-l-lg shadow-md"></div>
                    <div className="w-[4px] h-16 bg-gray-800 rounded-l-lg shadow-md"></div>
                  </div>

                  {/* Right Side Button - Power (Outside frame) */}
                  <div className="absolute right-0 top-32 translate-x-full z-10">
                    <div className="w-[4px] h-20 bg-gray-800 rounded-r-lg shadow-md"></div>
                  </div>

                  {/* Phone Frame */}
                  <div className="relative rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-800 shadow-2xl">
                    {/* Screen */}
                    <div className="relative bg-white rounded-[1.5rem] overflow-hidden h-[600px] flex flex-col">
                      {/* Status Bar */}
                      <div className="bg-gradient-to-b from-gray-700 to-gray-800 px-6 py-4 flex items-center justify-center gap-2">
                        <div className="bg-white rounded-full p-2">
                          <Smartphone className="h-5 w-5 text-gray-800" />
                        </div>
                        <span className="font-semibold text-sm text-white">
                          Su número de teléfono
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 p-6 bg-gradient-to-b from-gray-50 to-white overflow-auto">
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          {/* Media Placeholder */}
                          {selectedType === "media" && (
                            <div className="aspect-video bg-gray-100 flex items-center justify-center text-muted-foreground border-b">
                              {mediaVariable2 ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={mediaVariable2}
                                  alt="Media preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML =
                                      '<div class="flex items-center justify-center h-full text-sm">Your media will appear here</div>';
                                  }}
                                />
                              ) : (
                                <div className="text-sm">
                                  Your media will appear here
                                </div>
                              )}
                            </div>
                          )}

                          {/* Media Message Text */}
                          <div className="p-4">
                            <p className="text-sm">
                              {replaceVariablesWithSamples(
                                bodyText,
                                variablesText,
                              ) || bodyText}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
