"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import { Switch } from "@/components/ui/atomic/forms/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import { MessageSquare, Mail, Clock, Edit, Save } from "lucide-react";
import {
  type NotificationSettings,
  type WhatsAppTemplate,
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notifications";
import TextArea from "@/components/ui/atomic/forms/textarea";

export function NotificationsSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(
    getNotificationSettings()
  );
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [tempTemplate, setTempTemplate] = useState<WhatsAppTemplate | null>(
    null
  );

  useEffect(() => {
    setSettings(getNotificationSettings());
  }, []);

  const handleSave = () => {
    saveNotificationSettings(settings);
    alert("Configuración guardada exitosamente");
  };

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template.id);
    setTempTemplate({ ...template });
  };

  const handleSaveTemplate = () => {
    if (tempTemplate && editingTemplate) {
      const updatedTemplates = settings.whatsappTemplates.map((t) =>
        t.id === editingTemplate ? tempTemplate : t
      );
      setSettings({ ...settings, whatsappTemplates: updatedTemplates });
      setEditingTemplate(null);
      setTempTemplate(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setTempTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Notificaciones y Comunicación
          </h2>
          <p className="text-muted-foreground">
            Configura las notificaciones automáticas y plantillas de mensajes
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-medical-primary hover:bg-medical-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="w-4 h-4 mr-2" />
            Recordatorios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de WhatsApp</CardTitle>
              <CardDescription>
                Personaliza los mensajes que se envían automáticamente por
                WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.whatsappTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((variable) => (
                          <Badge
                            key={variable}
                            variant="secondary"
                            className="text-xs"
                          >
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                      disabled={editingTemplate === template.id}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>

                  {editingTemplate === template.id && tempTemplate ? (
                    <div className="space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`template-${template.id}`}>
                          Contenido del Mensaje
                        </Label>
                        <TextArea
                          id={`template-${template.id}`}
                          value={tempTemplate.content}
                          onChange={(e) =>
                            setTempTemplate({
                              ...tempTemplate,
                              content: e.target.value,
                            })
                          }
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveTemplate}>
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted p-3 rounded text-sm">
                      {template.content}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Email</CardTitle>
              <CardDescription>
                Configura el proveedor de email para envío de notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email-provider">Proveedor</Label>
                  <Select
                    value={settings.emailConfig.provider}
                    onValueChange={(value: "smtp" | "sendgrid" | "resend") =>
                      setSettings({
                        ...settings,
                        emailConfig: {
                          ...settings.emailConfig,
                          provider: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP Personalizado</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="resend">Resend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-email">Email Remitente</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={settings.emailConfig.fromEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailConfig: {
                          ...settings.emailConfig,
                          fromEmail: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">Nombre Remitente</Label>
                  <Input
                    id="from-name"
                    value={settings.emailConfig.fromName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailConfig: {
                          ...settings.emailConfig,
                          fromName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {settings.emailConfig.provider === "smtp" && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold">Configuración SMTP</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Servidor SMTP</Label>
                      <Input
                        id="smtp-host"
                        value={settings.emailConfig.smtpHost || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailConfig: {
                              ...settings.emailConfig,
                              smtpHost: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Puerto</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={settings.emailConfig.smtpPort || 587}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailConfig: {
                              ...settings.emailConfig,
                              smtpPort: Number.parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Usuario</Label>
                      <Input
                        id="smtp-user"
                        value={settings.emailConfig.smtpUser || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailConfig: {
                              ...settings.emailConfig,
                              smtpUser: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">Contraseña</Label>
                      <Input
                        id="smtp-password"
                        type="password"
                        value={settings.emailConfig.smtpPassword || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailConfig: {
                              ...settings.emailConfig,
                              smtpPassword: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {(settings.emailConfig.provider === "sendgrid" ||
                settings.emailConfig.provider === "resend") && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold">API Key</h4>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Clave API</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={settings.emailConfig.apiKey || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          emailConfig: {
                            ...settings.emailConfig,
                            apiKey: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recordatorio 24 Horas Antes</CardTitle>
                <CardDescription>
                  Envía recordatorios automáticos 24 horas antes de la cita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reminder-24h"
                    checked={settings.reminders.reminder24h.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        reminders: {
                          ...settings.reminders,
                          reminder24h: {
                            ...settings.reminders.reminder24h,
                            enabled: checked,
                          },
                        },
                      })
                    }
                  />
                  <Label htmlFor="reminder-24h">
                    Activar recordatorio 24h antes
                  </Label>
                </div>

                {settings.reminders.reminder24h.enabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Plantilla WhatsApp</Label>
                      <Select
                        value={settings.reminders.reminder24h.whatsappTemplate}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              reminder24h: {
                                ...settings.reminders.reminder24h,
                                whatsappTemplate: value,
                              },
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.whatsappTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plantilla Email</Label>
                      <Select
                        value={settings.reminders.reminder24h.emailTemplate}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              reminder24h: {
                                ...settings.reminders.reminder24h,
                                emailTemplate: value,
                              },
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reminder">Recordatorio</SelectItem>
                          <SelectItem value="confirmation">
                            Confirmación
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recordatorio 2 Horas Antes</CardTitle>
                <CardDescription>
                  Envía recordatorios automáticos 2 horas antes de la cita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reminder-2h"
                    checked={settings.reminders.reminder2h.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        reminders: {
                          ...settings.reminders,
                          reminder2h: {
                            ...settings.reminders.reminder2h,
                            enabled: checked,
                          },
                        },
                      })
                    }
                  />
                  <Label htmlFor="reminder-2h">
                    Activar recordatorio 2h antes
                  </Label>
                </div>

                {settings.reminders.reminder2h.enabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Plantilla WhatsApp</Label>
                      <Select
                        value={settings.reminders.reminder2h.whatsappTemplate}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              reminder2h: {
                                ...settings.reminders.reminder2h,
                                whatsappTemplate: value,
                              },
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.whatsappTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plantilla Email</Label>
                      <Select
                        value={settings.reminders.reminder2h.emailTemplate}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              reminder2h: {
                                ...settings.reminders.reminder2h,
                                emailTemplate: value,
                              },
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reminder">Recordatorio</SelectItem>
                          <SelectItem value="confirmation">
                            Confirmación
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
