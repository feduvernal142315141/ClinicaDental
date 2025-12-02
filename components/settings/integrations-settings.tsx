"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, Loader2, CreditCard, Cloud, Video, Calendar, BarChart3 } from "lucide-react"
import {
  getIntegrationSettings,
  saveIntegrationSettings,
  testIntegration,
  integrationsList,
  type IntegrationSettings,
} from "@/lib/integrations"

export function IntegrationsSettings() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setSettings(getIntegrationSettings())
  }, [])

  const handleSave = (section: keyof IntegrationSettings, data: any) => {
    if (!settings) return

    const updated = { ...settings, [section]: { ...settings[section], ...data } }
    setSettings(updated)
    saveIntegrationSettings({ [section]: updated[section] })
  }

  const handleTest = async (integrationId: string) => {
    setTesting(integrationId)
    try {
      const result = await testIntegration(integrationId)
      setTestResults((prev) => ({ ...prev, [integrationId]: result }))
    } catch (error) {
      setTestResults((prev) => ({ ...prev, [integrationId]: false }))
    } finally {
      setTesting(null)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const categoryIcons = {
    payment: CreditCard,
    storage: Cloud,
    communication: Video,
    calendar: Calendar,
    analytics: BarChart3,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integraciones</h2>
        <p className="text-muted-foreground">
          Conecta tu clínica con servicios externos para mejorar la funcionalidad.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="communication">Comunicación</TabsTrigger>
          <TabsTrigger value="storage">Almacenamiento</TabsTrigger>
          <TabsTrigger value="other">Otros</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrationsList.map((integration) => {
              const Icon = categoryIcons[integration.category]
              const isConfigured = testResults[integration.id] === true
              const isTesting = testing === integration.id

              return (
                <Card key={integration.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                      </div>
                      <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? "Conectado" : "Desconectado"}
                      </Badge>
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isConfigured && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {testResults[integration.id] === false && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(integration.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Probar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Stripe</span>
                </CardTitle>
                <CardDescription>Configuración para procesamiento de pagos con Stripe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.stripe.enabled}
                    onCheckedChange={(enabled) => handleSave("stripe", { enabled })}
                  />
                  <Label>Habilitar Stripe</Label>
                </div>

                {settings.stripe.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="stripe-public">Clave Pública</Label>
                      <Input
                        id="stripe-public"
                        value={settings.stripe.publicKey}
                        onChange={(e) => handleSave("stripe", { publicKey: e.target.value })}
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe-secret">Clave Secreta</Label>
                      <Input
                        id="stripe-secret"
                        type="password"
                        value={settings.stripe.secretKey}
                        onChange={(e) => handleSave("stripe", { secretKey: e.target.value })}
                        placeholder="sk_test_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe-webhook">Webhook Secret</Label>
                      <Input
                        id="stripe-webhook"
                        type="password"
                        value={settings.stripe.webhookSecret}
                        onChange={(e) => handleSave("stripe", { webhookSecret: e.target.value })}
                        placeholder="whsec_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe-currency">Moneda</Label>
                      <Select
                        value={settings.stripe.currency}
                        onValueChange={(currency) => handleSave("stripe", { currency })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                          <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>PayPal</span>
                </CardTitle>
                <CardDescription>Configuración para pagos con PayPal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.paypal.enabled}
                    onCheckedChange={(enabled) => handleSave("paypal", { enabled })}
                  />
                  <Label>Habilitar PayPal</Label>
                </div>

                {settings.paypal.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="paypal-client">Client ID</Label>
                      <Input
                        id="paypal-client"
                        value={settings.paypal.clientId}
                        onChange={(e) => handleSave("paypal", { clientId: e.target.value })}
                        placeholder="Client ID de PayPal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paypal-secret">Client Secret</Label>
                      <Input
                        id="paypal-secret"
                        type="password"
                        value={settings.paypal.clientSecret}
                        onChange={(e) => handleSave("paypal", { clientSecret: e.target.value })}
                        placeholder="Client Secret de PayPal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paypal-env">Entorno</Label>
                      <Select
                        value={settings.paypal.environment}
                        onValueChange={(environment: "sandbox" | "production") => handleSave("paypal", { environment })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                          <SelectItem value="production">Producción</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Zoom</span>
                </CardTitle>
                <CardDescription>Integración con Zoom para teleconsultas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.zoom.enabled}
                    onCheckedChange={(enabled) => handleSave("zoom", { enabled })}
                  />
                  <Label>Habilitar Zoom</Label>
                </div>

                {settings.zoom.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="zoom-api-key">API Key</Label>
                      <Input
                        id="zoom-api-key"
                        value={settings.zoom.apiKey}
                        onChange={(e) => handleSave("zoom", { apiKey: e.target.value })}
                        placeholder="API Key de Zoom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zoom-api-secret">API Secret</Label>
                      <Input
                        id="zoom-api-secret"
                        type="password"
                        value={settings.zoom.apiSecret}
                        onChange={(e) => handleSave("zoom", { apiSecret: e.target.value })}
                        placeholder="API Secret de Zoom"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Google Meet</span>
                </CardTitle>
                <CardDescription>Integración con Google Meet para videollamadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.googleMeet.enabled}
                    onCheckedChange={(enabled) => handleSave("googleMeet", { enabled })}
                  />
                  <Label>Habilitar Google Meet</Label>
                </div>

                {settings.googleMeet.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="meet-client-id">Client ID</Label>
                      <Input
                        id="meet-client-id"
                        value={settings.googleMeet.clientId}
                        onChange={(e) => handleSave("googleMeet", { clientId: e.target.value })}
                        placeholder="Client ID de Google"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meet-client-secret">Client Secret</Label>
                      <Input
                        id="meet-client-secret"
                        type="password"
                        value={settings.googleMeet.clientSecret}
                        onChange={(e) => handleSave("googleMeet", { clientSecret: e.target.value })}
                        placeholder="Client Secret de Google"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cloud className="h-5 w-5" />
                <span>Almacenamiento en la Nube</span>
              </CardTitle>
              <CardDescription>Configuración para backup automático de archivos médicos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.cloudStorage.enabled}
                  onCheckedChange={(enabled) => handleSave("cloudStorage", { enabled })}
                />
                <Label>Habilitar Almacenamiento en la Nube</Label>
              </div>

              {settings.cloudStorage.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storage-provider">Proveedor</Label>
                    <Select
                      value={settings.cloudStorage.provider}
                      onValueChange={(provider: "aws" | "google" | "azure" | "none") =>
                        handleSave("cloudStorage", { provider })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">Amazon S3</SelectItem>
                        <SelectItem value="google">Google Cloud Storage</SelectItem>
                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.cloudStorage.provider !== "none" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label htmlFor="storage-access-key">Access Key</Label>
                        <Input
                          id="storage-access-key"
                          value={settings.cloudStorage.config.accessKey || ""}
                          onChange={(e) =>
                            handleSave("cloudStorage", {
                              config: { ...settings.cloudStorage.config, accessKey: e.target.value },
                            })
                          }
                          placeholder="Access Key"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage-secret-key">Secret Key</Label>
                        <Input
                          id="storage-secret-key"
                          type="password"
                          value={settings.cloudStorage.config.secretKey || ""}
                          onChange={(e) =>
                            handleSave("cloudStorage", {
                              config: { ...settings.cloudStorage.config, secretKey: e.target.value },
                            })
                          }
                          placeholder="Secret Key"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage-bucket">Bucket/Container</Label>
                        <Input
                          id="storage-bucket"
                          value={settings.cloudStorage.config.bucket || ""}
                          onChange={(e) =>
                            handleSave("cloudStorage", {
                              config: { ...settings.cloudStorage.config, bucket: e.target.value },
                            })
                          }
                          placeholder="Nombre del bucket"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage-region">Región</Label>
                        <Input
                          id="storage-region"
                          value={settings.cloudStorage.config.region || ""}
                          onChange={(e) =>
                            handleSave("cloudStorage", {
                              config: { ...settings.cloudStorage.config, region: e.target.value },
                            })
                          }
                          placeholder="us-east-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Google Calendar</span>
                </CardTitle>
                <CardDescription>Sincronización bidireccional con Google Calendar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.googleCalendar.enabled}
                    onCheckedChange={(enabled) => handleSave("googleCalendar", { enabled })}
                  />
                  <Label>Habilitar Google Calendar</Label>
                </div>

                {settings.googleCalendar.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="calendar-client-id">Client ID</Label>
                      <Input
                        id="calendar-client-id"
                        value={settings.googleCalendar.clientId}
                        onChange={(e) => handleSave("googleCalendar", { clientId: e.target.value })}
                        placeholder="Client ID de Google"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendar-client-secret">Client Secret</Label>
                      <Input
                        id="calendar-client-secret"
                        type="password"
                        value={settings.googleCalendar.clientSecret}
                        onChange={(e) => handleSave("googleCalendar", { clientSecret: e.target.value })}
                        placeholder="Client Secret de Google"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.googleCalendar.syncEnabled}
                        onCheckedChange={(syncEnabled) => handleSave("googleCalendar", { syncEnabled })}
                      />
                      <Label>Sincronización automática</Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Google Analytics</span>
                </CardTitle>
                <CardDescription>Análisis de uso y estadísticas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.googleAnalytics.enabled}
                    onCheckedChange={(enabled) => handleSave("googleAnalytics", { enabled })}
                  />
                  <Label>Habilitar Google Analytics</Label>
                </div>

                {settings.googleAnalytics.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="ga-tracking-id">Tracking ID</Label>
                      <Input
                        id="ga-tracking-id"
                        value={settings.googleAnalytics.trackingId}
                        onChange={(e) => handleSave("googleAnalytics", { trackingId: e.target.value })}
                        placeholder="UA-XXXXXXXXX-X"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ga-measurement-id">Measurement ID</Label>
                      <Input
                        id="ga-measurement-id"
                        value={settings.googleAnalytics.measurementId}
                        onChange={(e) => handleSave("googleAnalytics", { measurementId: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Backup</CardTitle>
              <CardDescription>Configuración para respaldo automático de datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.backup.enabled}
                  onCheckedChange={(enabled) => handleSave("backup", { enabled })}
                />
                <Label>Habilitar Backup Automático</Label>
              </div>

              {settings.backup.enabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="backup-frequency">Frecuencia</Label>
                    <Select
                      value={settings.backup.frequency}
                      onValueChange={(frequency: "daily" | "weekly" | "monthly") => handleSave("backup", { frequency })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="backup-retention">Retención (días)</Label>
                    <Input
                      id="backup-retention"
                      type="number"
                      value={settings.backup.retention}
                      onChange={(e) => handleSave("backup", { retention: Number.parseInt(e.target.value) })}
                      min="1"
                      max="365"
                    />
                  </div>
                  <div>
                    <Label htmlFor="backup-destination">Destino</Label>
                    <Select
                      value={settings.backup.destination}
                      onValueChange={(destination: "local" | "cloud") => handleSave("backup", { destination })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="cloud">Nube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
