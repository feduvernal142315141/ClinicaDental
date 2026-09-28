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
  RefreshCw,
  Edit,
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
        variables: [],
      });

      if (result) {
        // Recargar templates
        const updated = await clinicTemplateService.getClinicTemplates();
        setClinicTemplates(updated);
        setIsCreatingTemplate(false);
        setNewTemplate({ name: "", body: "" });
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{t("settings.notifications.whatsapp.title")}</CardTitle>
                    <Button type="button" variant="outline" size="sm"
                      disabled={isSyncing || savingTemplate} onClick={syncMetaTemplates}
                      aria-busy={isSyncing}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <RefreshCw className="mr-2 h-4 w-4" />}
                      {t("settings.notifications.whatsapp.syncMeta")}
                    </Button>
                  </div>
                  <CardDescription>
                    {t("settings.notifications.whatsapp.description")}
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
                      {t("settings.notifications.whatsapp.empty")}
                    </div>
                  )}

                  <Separator />

                  {isCreatingTemplate ? (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                      <h4 className="font-semibold">
                        {t("settings.notifications.whatsapp.newTemplate")}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="template-name">
                            {t("settings.notifications.whatsapp.name")}
                          </Label>
                          <Input
                            id="template-name"
                            value={newTemplate.name}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                name: e.target.value,
                              })
                            }
                            placeholder={t("settings.notifications.whatsapp.namePlaceholder")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-body">
                            {t("settings.notifications.whatsapp.content")}
                          </Label>
                          <TextArea
                            id="template-body"
                            value={newTemplate.body}
                            onChange={(e) =>
                              setNewTemplate({
                                ...newTemplate,
                                body: e.target.value,
                              })
                            }
                            placeholder={t("settings.notifications.whatsapp.contentPlaceholder")}
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateTemplate}
                          disabled={savingTemplate || isSyncing}
                          className="bg-medical-primary hover:bg-medical-primary/90"
                        >
                          {savingTemplate && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          {t("settings.notifications.whatsapp.create")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsCreatingTemplate(false);
                            setNewTemplate({ name: "", body: "" });
                          }}
                          disabled={savingTemplate || isSyncing}
                        >
                          {t("settings.notifications.whatsapp.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsCreatingTemplate(true)}
                      variant="outline"
                      className="w-full"
                      disabled={savingTemplate || isSyncing}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("settings.notifications.whatsapp.newMetaTemplate")}
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
                  <CardTitle>{t("settings.notifications.reminders.title")}</CardTitle>
                  <CardDescription>
                    {t("settings.notifications.reminders.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {reminderConfigs.length > 0 ? (
                    <div className="space-y-4">
                      {reminderConfigs.map((reminder) => (
                        <div key={reminder.id} className="border rounded-lg p-4">
                          {editingReminder === reminder.id ? (
                            <div className="space-y-4">
                              <h5 className="font-semibold">
                                {t("settings.notifications.reminders.edit")}
                              </h5>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-minutes-${reminder.id}`}>
                                    {t("settings.notifications.reminders.minutesBefore")}
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
                                    {t("settings.notifications.reminders.template")}
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
                                  {t("settings.notifications.reminders.save")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditReminder}
                                  disabled={savingReminder}
                                >
                                  {t("settings.notifications.reminders.cancel")}
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
                                      {t("settings.notifications.reminders.reminder")}{" "}
                                      {formatMinutesToLabel(
                                        reminder.reminderMinutesBefore
                                      )}{" "}
                                      {t("settings.notifications.reminders.before")}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {t("settings.notifications.reminders.templateLabel")}{" "}
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
                      {t("settings.notifications.reminders.empty")}
                    </div>
                  )}

                  <Separator />

                  {isAddingReminder ? (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                      <h4 className="font-semibold">
                        {t("settings.notifications.reminders.addNew")}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reminder-minutes">
                            {t("settings.notifications.reminders.minutesBeforeAppointment")}
                          </Label>
                          <Input
                            id="reminder-minutes"
                            type="number"
                            min="1"
                            value={newReminderMinutes}
                            onChange={(e) => setNewReminderMinutes(e.target.value)}
                            placeholder={t("settings.notifications.reminders.minutesPlaceholder")}
                          />
                          <p className="text-xs text-muted-foreground">
                            {formatMinutesToLabel(
                              parseInt(newReminderMinutes) || 0
                            )}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reminder-template">
                            {t("settings.notifications.reminders.metaTemplate")}
                          </Label>
                          <Select
                            value={newReminderTemplate}
                            onValueChange={setNewReminderTemplate}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("settings.notifications.reminders.selectTemplate")}
                              />
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
                                  {t("settings.notifications.reminders.noApprovedTemplates")}
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
                          {t("settings.notifications.reminders.add")}
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
                          {t("settings.notifications.reminders.cancel")}
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
                      {t("settings.notifications.reminders.addReminder")}
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
