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
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import {
  MessageSquare,
  Mail,
  Clock,
  Save,
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

import { useSyncMetaTemplates } from "@/lib/hooks/use-sync-meta-templates";
import { useI18n } from "@/lib/contexts/i18n-context";
import { WhatsAppTemplatesPanel, RemindersPanel } from "./whatsapp-templates";

export function NotificationsSettings() {
  const { t } = useI18n();
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
  const { sync: syncMetaTemplates, isSyncing } = useSyncMetaTemplates(setClinicTemplates);
  const [savingReminder, setSavingReminder] = useState(false);

  // Estado para crear template Meta
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    body: "",
    category: "MARKETING" as "UTILITY" | "MARKETING",
  });
  const [templateVariables, setTemplateVariables] = useState<Array<{ id: string; placeholder: string; sampleContent: string }>>([]);
  const [placeholderError, setPlaceholderError] = useState("");

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
        notify.error(t("settings.notifications.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Guardar cambios en Email config
  const handleSaveEmailConfig = () => {
    saveNotificationSettings(settings);
    notify.success(t("settings.notifications.emailSaved"));
  };

  // Crear nuevo template Meta
  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) {
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.templateRequired"),
      });
      return;
    }

    setSavingTemplate(true);
    try {
      const result = await clinicTemplateService.createClinicTemplate({
        name: newTemplate.name,
        body: newTemplate.body,
        type: "APPOINTMENT_REMINDER",
        category: newTemplate.category,
        variables: templateVariables.map((v) => ({
          id: v.id,
          placeholder: v.placeholder,
          sampleContent: v.sampleContent,
          type: "text",
        })),
      });

      if (result) {
        // Recargar templates
        const updated = await clinicTemplateService.getClinicTemplates();
        setClinicTemplates(updated);
        setIsCreatingTemplate(false);
        setNewTemplate({ name: "", body: "", category: "MARKETING" });
        setTemplateVariables([]);
        setPlaceholderError("");
        notify.success(t("settings.notifications.templateCreated"), {
          description: t("settings.notifications.templateCreatedDescription"),
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.templateCreateFailed"),
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Crear template — interfaz para WhatsAppTemplatesPanel
  const handleCreateTemplateFromPanel = async (data: {
    name: string;
    body: string;
    category: "MARKETING" | "UTILITY";
    variables: Array<{ id: string; placeholder: string; sampleContent: string }>;
  }) => {
    setSavingTemplate(true);
    try {
      const result = await clinicTemplateService.createClinicTemplate({
        name: data.name,
        body: data.body,
        type: "APPOINTMENT_REMINDER",
        category: data.category,
        variables: data.variables.map((v) => ({
          id: v.id,
          placeholder: v.placeholder,
          sampleContent: v.sampleContent,
          type: "text",
        })),
      });
      if (result) {
        const updated = await clinicTemplateService.getClinicTemplates();
        setClinicTemplates(updated);
        notify.success(t("settings.notifications.templateCreated"), {
          description: t("settings.notifications.templateCreatedDescription"),
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.templateCreateFailed"),
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Agregar nuevo recordatorio
  const handleAddReminder = async () => {
    if (!newReminderMinutes || !newReminderTemplate) {
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.reminderRequired"),
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
        notify.success(t("settings.notifications.reminderAdded"));
      }
    } catch (error) {
      console.error("Error adding reminder:", error);
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.reminderAddFailed"),
      });
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
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.incompleteData"),
      });
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
        notify.success(t("settings.notifications.reminderUpdated"));
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.reminderUpdateFailed"),
      });
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
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.reminderUpdateFailed"),
      });
    } finally {
      setSavingReminder(false);
    }
  };

  // Eliminar recordatorio
  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm(t("settings.notifications.deleteReminderConfirm"))) {
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
        notify.success(t("settings.notifications.reminderDeleted"));
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      notify.error(t("settings.notifications.error"), {
        description: t("settings.notifications.reminderDeleteFailed"),
      });
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

  // --- Variable handling for template creation ---
  const handleBodyChange = (text: string) => {
    setNewTemplate((prev) => ({ ...prev, body: text }));
    // Extract {{N}} placeholders
    const regex = /\{\{(\d+)}}/g;
    const found = new Map<string, boolean>();
    let m;
    while ((m = regex.exec(text)) !== null) {
      found.set(m[1], true);
    }
    // Check for stray braces
    const cleaned = text.replace(/\{\{\d+}}/g, "");
    if (cleaned.includes("{") || cleaned.includes("}")) {
      setPlaceholderError("Llaves malformadas. Use el formato {{1}}, {{2}}, etc.");
      return;
    }
    const ids = Array.from(found.keys()).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== i + 1) {
        setPlaceholderError(`Las variables deben ser consecutivas. Se esperaba {{${i + 1}}}.`);
        return;
      }
    }
    setPlaceholderError("");
    setTemplateVariables((prev) =>
      ids.map((id) => {
        const existing = prev.find((v) => v.id === String(id));
        return {
          id: String(id),
          placeholder: `{{${id}}}`,
          sampleContent: existing?.sampleContent ?? "",
        };
      })
    );
  };

  const addTemplateVariable = () => {
    const nextId = templateVariables.length + 1;
    setNewTemplate((prev) => ({
      ...prev,
      body: prev.body + `{{${nextId}}}`,
    }));
    setTemplateVariables((prev) => [
      ...prev,
      { id: String(nextId), placeholder: `{{${nextId}}}`, sampleContent: "" },
    ]);
  };

  const previewBody = (text: string) => {
    let result = text;
    templateVariables.forEach((v) => {
      if (v.sampleContent) {
        result = result.replace(
          new RegExp(`\\{\\{${v.id}\\}\\}`, "g"),
          v.sampleContent
        );
      }
    });
    return result;
  };

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
            {t("settings.notifications.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("settings.notifications.description")}
          </p>
        </div>
        <Button
          onClick={handleSaveEmailConfig}
          className="bg-medical-primary hover:bg-medical-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          {t("settings.notifications.saveChanges")}
        </Button>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("settings.notifications.tabs.whatsapp")}
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            {t("settings.notifications.tabs.email")}
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="w-4 h-4 mr-2" />
            {t("settings.notifications.tabs.reminders")}
          </TabsTrigger>
        </TabsList>

        {/* TAB: WhatsApp Templates */}
        <TabsContent value="whatsapp">
          <WhatsAppTemplatesPanel
            templates={clinicTemplates}
            loading={loading}
            onSync={syncMetaTemplates}
            isSyncing={isSyncing}
            onCreate={handleCreateTemplateFromPanel}
            savingTemplate={savingTemplate}
          />
        </TabsContent>

        {/* TAB: Email */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications.email.title")}</CardTitle>
              <CardDescription>
                {t("settings.notifications.email.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email-provider">
                    {t("settings.notifications.email.provider")}
                  </Label>
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
                      <SelectItem value="smtp">
                        {t("settings.notifications.email.smtpCustom")}
                      </SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="resend">Resend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-email">
                    {t("settings.notifications.email.fromEmail")}
                  </Label>
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
                  <Label htmlFor="from-name">
                    {t("settings.notifications.email.fromName")}
                  </Label>
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
                  <h4 className="font-semibold">
                    {t("settings.notifications.email.smtpConfig")}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">
                        {t("settings.notifications.email.smtpServer")}
                      </Label>
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
                      <Label htmlFor="smtp-port">
                        {t("settings.notifications.email.port")}
                      </Label>
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
                      <Label htmlFor="smtp-user">
                        {t("settings.notifications.email.user")}
                      </Label>
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
                      <Label htmlFor="smtp-password">
                        {t("settings.notifications.email.password")}
                      </Label>
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
                    <Label htmlFor="api-key">
                      {t("settings.notifications.email.apiKey")}
                    </Label>
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
        <TabsContent value="reminders">
          <RemindersPanel
            reminders={reminderConfigs}
            templates={clinicTemplates}
            loading={loading}
            saving={savingReminder}
            onAdd={async (minutes, templateId) => {
              setSavingReminder(true);
              try {
                const result = await reminderConfigService.createReminderConfig({ reminderMinutesBefore: minutes, templateId });
                if (result) {
                  const updated = await reminderConfigService.getReminderConfigs();
                  setReminderConfigs(updated);
                  notify.success(t("settings.notifications.reminderAdded"));
                }
              } catch {
                notify.error(t("settings.notifications.error"), { description: t("settings.notifications.reminderAddFailed") });
              } finally {
                setSavingReminder(false);
              }
            }}
            onUpdate={async (id, data) => {
              setSavingReminder(true);
              try {
                const success = await reminderConfigService.updateReminderConfig(id, data);
                if (success) {
                  const updated = await reminderConfigService.getReminderConfigs();
                  setReminderConfigs(updated);
                  notify.success(t("settings.notifications.reminderUpdated"));
                }
              } catch {
                notify.error(t("settings.notifications.error"), { description: t("settings.notifications.reminderUpdateFailed") });
              } finally {
                setSavingReminder(false);
              }
            }}
            onToggle={async (id, enabled) => {
              setSavingReminder(true);
              try {
                const success = await reminderConfigService.updateReminderConfig(id, { enabled });
                if (success) {
                  const updated = await reminderConfigService.getReminderConfigs();
                  setReminderConfigs(updated);
                }
              } catch {
                notify.error(t("settings.notifications.error"), { description: t("settings.notifications.reminderUpdateFailed") });
              } finally {
                setSavingReminder(false);
              }
            }}
            onDelete={(id) => {
              if (!confirm(t("settings.notifications.deleteReminderConfirm"))) return;
              setSavingReminder(true);
              reminderConfigService.deleteReminderConfig(id).then((success) => {
                if (success) {
                  reminderConfigService.getReminderConfigs().then(setReminderConfigs);
                  notify.success(t("settings.notifications.reminderDeleted"));
                }
              }).catch(() => {
                notify.error(t("settings.notifications.error"), { description: t("settings.notifications.reminderDeleteFailed") });
              }).finally(() => setSavingReminder(false));
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
