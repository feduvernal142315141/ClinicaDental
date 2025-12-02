"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  getClinicSettings,
  updateClinicSettings,
  type ClinicSettings,
} from "@/lib/clinic-settings";
import { useToast } from "@/hooks/use-toast";

const currencies = [
  { value: "USD", label: "USD - Dólar Estadounidense" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "MXN", label: "MXN - Peso Mexicano" },
  { value: "COP", label: "COP - Peso Colombiano" },
  { value: "ARS", label: "ARS - Peso Argentino" },
];

const timezones = [
  { value: "America/New_York", label: "Este (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Montaña (Denver)" },
  { value: "America/Los_Angeles", label: "Pacífico (Los Angeles)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  {
    value: "America/Argentina/Buenos_Aires",
    label: "Argentina (Buenos Aires)",
  },
];

const daysOfWeek = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function GeneralSettings() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getClinicSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateClinicSettings(settings);
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<ClinicSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  const updateBusinessHours = (
    day: string,
    field: string,
    value: string | boolean
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      businessHours: {
        ...settings.businessHours,
        [day]: {
          ...settings.businessHours[day as keyof typeof settings.businessHours],
          [field]: value,
        },
      },
    });
  };

  const updateAppointmentPolicies = (
    field: string,
    value: number | boolean
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      appointmentPolicies: {
        ...settings.appointmentPolicies,
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Datos de la Clínica */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la Clínica</CardTitle>
          <CardDescription>
            Información básica que aparecerá en documentos y comunicaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">Nombre de la Clínica</Label>
              <Input
                id="clinic-name"
                value={settings.name}
                onChange={(e) => updateSettings({ name: e.target.value })}
                placeholder="Nombre de la clínica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-phone">Teléfono</Label>
              <Input
                id="clinic-phone"
                value={settings.phone}
                onChange={(e) => updateSettings({ phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-email">Email</Label>
              <Input
                id="clinic-email"
                type="email"
                value={settings.email}
                onChange={(e) => updateSettings({ email: e.target.value })}
                placeholder="info@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-website">Sitio Web (opcional)</Label>
              <Input
                id="clinic-website"
                value={settings.website || ""}
                onChange={(e) => updateSettings({ website: e.target.value })}
                placeholder="www.clinica.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic-address">Dirección</Label>
            <Input
              id="clinic-address"
              value={settings.address}
              onChange={(e) => updateSettings({ address: e.target.value })}
              placeholder="Dirección completa de la clínica"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuración Regional */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Regional</CardTitle>
          <CardDescription>
            Moneda y zona horaria para la clínica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => updateSettings({ currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zona Horaria</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSettings({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horarios de Atención */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios de Atención</CardTitle>
          <CardDescription>
            Configure los horarios de operación de la clínica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => {
            const dayData =
              settings.businessHours[
                day.key as keyof typeof settings.businessHours
              ];
            return (
              <div key={day.key} className="flex items-center space-x-4">
                <div className="w-20">
                  <Label>{day.label}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!dayData.closed}
                    onCheckedChange={(checked) =>
                      updateBusinessHours(day.key, "closed", !checked)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {dayData.closed ? "Cerrado" : "Abierto"}
                  </span>
                </div>
                {!dayData.closed && (
                  <>
                    <Input
                      type="time"
                      value={dayData.open}
                      onChange={(e) =>
                        updateBusinessHours(day.key, "open", e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={dayData.close}
                      onChange={(e) =>
                        updateBusinessHours(day.key, "close", e.target.value)
                      }
                      className="w-32"
                    />
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Políticas de Citas */}
      <Card>
        <CardHeader>
          <CardTitle>Políticas de Citas</CardTitle>
          <CardDescription>
            Configure las reglas para el manejo de citas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advance-time">
                Tiempo mínimo de anticipación (horas)
              </Label>
              <Input
                id="advance-time"
                type="number"
                min="0"
                value={settings.appointmentPolicies.minimumAdvanceTime}
                onChange={(e) =>
                  updateAppointmentPolicies(
                    "minimumAdvanceTime",
                    Number.parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellation-limit">
                Límite de cancelaciones por mes
              </Label>
              <Input
                id="cancellation-limit"
                type="number"
                min="0"
                value={settings.appointmentPolicies.cancellationLimit}
                onChange={(e) =>
                  updateAppointmentPolicies(
                    "cancellationLimit",
                    Number.parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="standard-duration">
              Duración estándar de citas (minutos)
            </Label>
            <Input
              id="standard-duration"
              type="number"
              min="15"
              step="15"
              value={settings.appointmentPolicies.standardDuration}
              onChange={(e) =>
                updateAppointmentPolicies(
                  "standardDuration",
                  Number.parseInt(e.target.value) || 30
                )
              }
              className="w-32"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir reservas en línea</Label>
                <p className="text-sm text-muted-foreground">
                  Los pacientes pueden agendar citas por sí mismos
                </p>
              </div>
              <Switch
                checked={settings.appointmentPolicies.allowOnlineBooking}
                onCheckedChange={(checked) =>
                  updateAppointmentPolicies("allowOnlineBooking", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requerir confirmación</Label>
                <p className="text-sm text-muted-foreground">
                  Las citas deben ser confirmadas por el personal
                </p>
              </div>
              <Switch
                checked={settings.appointmentPolicies.requireConfirmation}
                onCheckedChange={(checked) =>
                  updateAppointmentPolicies("requireConfirmation", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enviar recordatorios</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar recordatorios automáticos a los pacientes
                </p>
              </div>
              <Switch
                checked={settings.appointmentPolicies.sendReminders}
                onCheckedChange={(checked) =>
                  updateAppointmentPolicies("sendReminders", checked)
                }
              />
            </div>

            {settings.appointmentPolicies.sendReminders && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="reminder-time">
                  Tiempo de recordatorio (horas antes)
                </Label>
                <Input
                  id="reminder-time"
                  type="number"
                  min="1"
                  value={settings.appointmentPolicies.reminderTime}
                  onChange={(e) =>
                    updateAppointmentPolicies(
                      "reminderTime",
                      Number.parseInt(e.target.value) || 24
                    )
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}
