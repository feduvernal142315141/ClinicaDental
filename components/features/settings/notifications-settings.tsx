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
import {
  MessageSquare,
  Mail,
  Clock,
  Save,
  Trash2,
  Plus,
  Loader2,
  Edit,
  X,
} from "lucide-react";
import {
  type NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notifications";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { notify } from "@/lib/utils/notify";
import { reminderConfigService } from "@/lib/services/settings/reminder-config.service";
import { clinicTemplateService } from "@/lib/services/template/clinic-template.service";
import type {
  ReminderConfigResponse,
  ClinicTemplate,
  CreateReminderConfigRequest,
  UpdateReminderConfigRequest,
} from "@/lib/entity/settings";

export function NotificationsSettings() {
  // Estado para Email general (localStorage, compatible con anterior)
  const [settings, setSettings] = useState<NotificationSettings>(
    getNotificationSettings()
  );

  // Estado para templates y recordatorios desde backend
  const [clinicTemplates, setClinicTemplates] = useState<ClinicTemplate[]>([]);
  const [reminderConfigs, setReminderConfigs] = useState<
    ReminderConfigResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  // Estado para crear template Meta
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    body: "",
  });

  // Estado para crear/editar recordatorio
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [editReminderData, setEditReminderData] = useState({
    minutes: "",
    templateId: "",
  });
  const [newReminderMinutes, setNewReminderMinutes] = useState<string>("1440");
  const [newReminderTemplate, setNewReminderTemplate] = useState<string>("");

  // Cargar data del backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [configs, templates] = await Promise.all([
          reminderConfigService.getReminderConfigs(),
          clinicTemplateService.getClinicTemplates(),
        ]);
        setReminderConfigs(configs);
        setClinicTemplates(templates);
      } catch (error) {
        console.error("Error loading data:", error);
        notify.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Guardar cambios en Email config
  const handleSaveEmailConfig = () => {
    saveNotificationSettings(settings);
    notify.success("Configuración de email guardada");
  };

  // Crear nuevo template Meta
  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) {
      notify.error("Error", {
        description: "Nombre y contenido de plantilla son requeridos",
      });
      return;
    }

    setSavingTemplate(true);
    try {
      const result = await clinicTemplateService.createClinicTemplate({
        name: newTemplate.name,
        body: newTemplate.body,
        type: "APPOINTMENT_REMINDER",
        variables: [],
      });

      if (result) {
        // Recargar templates
        const updated = await clinicTemplateService.getClinicTemplates();
        setClinicTemplates(updated);
        setIsCreatingTemplate(false);
        setNewTemplate({ name: "", body: "" });
        notify.success("Plantilla creada", {
          description: "La plantilla se está sincronizando con Meta",
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      notify.error("Error", { description: "No se pudo crear la plantilla" });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Agregar nuevo recordatorio
  const handleAddReminder = async () => {
    if (!newReminderMinutes || !newReminderTemplate) {
      notify.error("Error", {
        description:
          "Por favor completa tiempo y plantilla para el recordatorio",
      });
      return;
    }

    setSavingReminder(true);
    try {
      const payload: CreateReminderConfigRequest = {
        reminderMinutesBefore: parseInt(newReminderMinutes),
        templateId: newReminderTemplate,
      };

      const result = await reminderConfigService.createReminderConfig(payload);
      if (result) {
        const updated = await reminderConfigService.getReminderConfigs();
        setReminderConfigs(updated);
        setIsAddingReminder(false);
        setNewReminderMinutes("1440");
        setNewReminderTemplate("");
        notify.success("Recordatorio agregado");
      }
    } catch (error) {
      console.error("Error adding reminder:", error);
      notify.error("Error", { description: "No se pudo agregar el recordatorio" });
    } finally {
      setSavingReminder(false);
    }
  };

  // Editar recordatorio
  const handleStartEditReminder = (reminder: ReminderConfigResponse) => {
    setEditingReminder(reminder.id);
    setEditReminderData({
      minutes: reminder.reminderMinutesBefore.toString(),
      templateId: reminder.templateId,
    });
  };

  const handleSaveEditReminder = async () => {
    if (!editingReminder || !editReminderData.minutes || !editReminderData.templateId) {
      notify.error("Error", { description: "Datos incompletos" });
      return;
    }

    setSavingReminder(true);
    try {
      const payload: UpdateReminderConfigRequest = {
        reminderMinutesBefore: parseInt(editReminderData.minutes),
        templateId: editReminderData.templateId,
      };

      const success = await reminderConfigService.updateReminderConfig(
        editingReminder,
        payload
      );

      if (success) {
        const updated = await reminderConfigService.getReminderConfigs();
        setReminderConfigs(updated);
        setEditingReminder(null);
        notify.success("Recordatorio actualizado");
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      notify.error("Error", { description: "No se pudo actualizar el recordatorio" });
    } finally {
      setSavingReminder(false);
    }
  };

  const handleCancelEditReminder = () => {
    setEditingReminder(null);
    setEditReminderData({ minutes: "", templateId: "" });
  };

  // Actualizar estado de recordatorio (enabled/disabled)
  const handleToggleReminder = async (
    reminderId: string,
    enabled: boolean
  ) => {
    setSavingReminder(true);
    try {
      const payload: UpdateReminderConfigRequest = { enabled };
      const success = await reminderConfigService.updateReminderConfig(
        reminderId,
        payload
      );
      if (success) {
        const updated = await reminderConfigService.getReminderConfigs();
        setReminderConfigs(updated);
      }
    } catch (error) {
      console.error("Error toggling reminder:", error);
      notify.error("Error", { description: "No se pudo actualizar el recordatorio" });
    } finally {
      setSavingReminder(false);
    }
  };

  // Eliminar recordatorio
  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este recordatorio?")) {
      return;
    }

    setSavingReminder(true);
    try {
      const success = await reminderConfigService.deleteReminderConfig(
        reminderId
      );
      if (success) {
        const updated = await reminderConfigService.getReminderConfigs();
        setReminderConfigs(updated);
        notify.success("Recordatorio eliminado");
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      notify.error("Error", { description: "No se pudo eliminar el recordatorio" });
    } finally {
      setSavingReminder(false);
    }
  };

  // Helpers
  const getTemplateName = (templateId: string): string => {
    const template = clinicTemplates.find((t) => t.id === templateId);
    return template?.name || templateId;
  };

  const getTemplateStatus = (
    templateId: string
  ): "PENDING" | "APPROVED" | "REJECTED" | undefined => {
    const template = clinicTemplates.find((t) => t.id === templateId);
    return template?.metaTemplateStatus;
  };

  const approvedTemplates = clinicTemplates.filter(
    (t) => t.metaTemplateStatus === "APPROVED" && t.provider === "META"
  );

  const formatMinutesToLabel = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes === 60) return "1h";
    if (minutes === 1440) return "24h";
    if (minutes === 120) return "2h";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStatusBadgeColor = (
    status?: "PENDING" | "APPROVED" | "REJECTED"
  ) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
          onClick={handleSaveEmailConfig}
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
            WhatsApp Templates
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

        {/* TAB: WhatsApp Templates */}
        <TabsContent value="whatsapp" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-medical-primary" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Plantillas de WhatsApp (Meta)</CardTitle>
                  <CardDescription>
                    Administra plantillas Meta para envío automático de mensajes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {clinicTemplates.length > 0 ? (
                    <div className="space-y-4">
                      {clinicTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{template.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {template.body}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Badge
                                className={getStatusBadgeColor(
                                  template.metaTemplateStatus
                                )}
                              >
                                {template.metaTemplateStatus || "N/A"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.provider}
                              </Badge>
                            </div>
                          </div>
                          {template.metaTemplateName && (
                            <p className="text-xs text-muted-foreground">
                              Meta ID: {template.metaTemplateName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay plantillas configuradas
                    </div>
                  )}

                  <Separator />

                  {isCreatingTemplate ? (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                      <h4 className="font-semibold">Nueva plantilla</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="template-name">Nombre</Label>
                          <Input
                            id="template-name"
                            value={newTemplate.name}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                name: e.target.value,
                              })
                            }
                            placeholder="p.ej. appointment_reminder_24h"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-body">Contenido</Label>
                          <TextArea
                            id="template-body"
                            value={newTemplate.body}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                body: e.target.value,
                              })
                            }
                            placeholder="Contenido de la plantilla"
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateTemplate}
                          disabled={savingTemplate}
                          className="bg-medical-primary hover:bg-medical-primary/90"
                        >
                          {savingTemplate && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Crear
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsCreatingTemplate(false);
                            setNewTemplate({ name: "", body: "" });
                          }}
                          disabled={savingTemplate}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsCreatingTemplate(true)}
                      variant="outline"
                      className="w-full"
                      disabled={savingTemplate}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva plantilla Meta
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: Email */}
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

        {/* TAB: Recordatorios */}
        <TabsContent value="reminders" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-medical-primary" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Recordatorios de Citas</CardTitle>
                  <CardDescription>
                    Configura automáticamente cuándo enviar recordatorios a los
                    pacientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {reminderConfigs.length > 0 ? (
                    <div className="space-y-4">
                      {reminderConfigs.map((reminder) => (
                        <div key={reminder.id} className="border rounded-lg p-4">
                          {editingReminder === reminder.id ? (
                            <div className="space-y-4">
                              <h5 className="font-semibold">Editar recordatorio</h5>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-minutes-${reminder.id}`}>
                                    Minutos antes
                                  </Label>
                                  <Input
                                    id={`edit-minutes-${reminder.id}`}
                                    type="number"
                                    min="1"
                                    value={editReminderData.minutes}
                                    onChange={(e) =>
                                      setEditReminderData({
                                        ...editReminderData,
                                        minutes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-template-${reminder.id}`}>
                                    Plantilla
                                  </Label>
                                  <Select
                                    value={editReminderData.templateId}
                                    onValueChange={(value) =>
                                      setEditReminderData({
                                        ...editReminderData,
                                        templateId: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {approvedTemplates.map((template) => (
                                        <SelectItem
                                          key={template.id}
                                          value={template.id}
                                        >
                                          {template.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEditReminder}
                                  disabled={savingReminder}
                                  className="bg-medical-primary hover:bg-medical-primary/90"
                                >
                                  {savingReminder && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  )}
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditReminder}
                                  disabled={savingReminder}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-medical-primary" />
                                  <div>
                                    <h4 className="font-semibold">
                                      Recordatorio{" "}
                                      {formatMinutesToLabel(
                                        reminder.reminderMinutesBefore
                                      )}{" "}
                                      antes
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      Plantilla:{" "}
                                      <span className="font-medium">
                                        {getTemplateName(reminder.templateId)}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge
                                    className={`${getStatusBadgeColor(
                                      getTemplateStatus(reminder.templateId)
                                    )} text-xs`}
                                  >
                                    {getTemplateStatus(reminder.templateId) ||
                                      "UNKNOWN"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={reminder.enabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleReminder(reminder.id, checked)
                                  }
                                  disabled={savingReminder}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleStartEditReminder(reminder)
                                  }
                                  disabled={savingReminder}
                                >
                                  <Edit className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteReminder(reminder.id)
                                  }
                                  disabled={savingReminder}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay recordatorios configurados aún
                    </div>
                  )}

                  <Separator />

                  {isAddingReminder ? (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                      <h4 className="font-semibold">
                        Agregar nuevo recordatorio
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reminder-minutes">
                            Minutos antes de la cita
                          </Label>
                          <Input
                            id="reminder-minutes"
                            type="number"
                            min="1"
                            value={newReminderMinutes}
                            onChange={(e) => setNewReminderMinutes(e.target.value)}
                            placeholder="p.ej. 1440 (24 horas)"
                          />
                          <p className="text-xs text-muted-foreground">
                            {formatMinutesToLabel(
                              parseInt(newReminderMinutes) || 0
                            )}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reminder-template">
                            Plantilla Meta
                          </Label>
                          <Select
                            value={newReminderTemplate}
                            onValueChange={setNewReminderTemplate}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar plantilla" />
                            </SelectTrigger>
                            <SelectContent>
                              {approvedTemplates.length > 0 ? (
                                approvedTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No hay plantillas aprobadas
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddReminder}
                          disabled={savingReminder}
                          className="bg-medical-primary hover:bg-medical-primary/90"
                        >
                          {savingReminder && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Agregar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAddingReminder(false);
                            setNewReminderMinutes("1440");
                            setNewReminderTemplate("");
                          }}
                          disabled={savingReminder}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsAddingReminder(true)}
                      variant="outline"
                      className="w-full"
                      disabled={savingReminder}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar recordatorio
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
