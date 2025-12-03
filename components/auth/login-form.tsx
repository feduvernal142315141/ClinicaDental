"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/primitives/shadcn/button"
import { Input } from "@/components/ui/atomic/forms/input"
import { Label } from "@/components/ui/atomic/forms/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/atomic/data-display/card"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"

const clinicImages = [
  {
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Clinica-Dental-confianza-murcia.jpg-s1w6bYmCBLzxnTkRAnaJzziFKIGOrc.jpeg",
    alt: "Paciente sonriente durante tratamiento dental",
  },
  {
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Clinica-dadent-home-6Da9GEZzPPhzhVGgwWhRWK1sg8SZT7.webp",
    alt: "Equipo médico profesional en consultorio moderno",
  },
  {
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tu-dentista-en-madrid-kQZyaTr9YvSz783GdYfuaG9HOS0oSD.webp",
    alt: "Atención dental profesional y confiable",
  },
]

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { login, loading, authError } = useAuth()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % clinicImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Usuario o contraseña incorrectos")
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % clinicImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + clinicImages.length) % clinicImages.length)
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo con imágenes */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-medical-primary/20 to-medical-secondary/20 z-10" />
        <img
          src={clinicImages[currentImageIndex].url || "/placeholder.svg"}
          alt={clinicImages[currentImageIndex].alt}
          className="w-full h-full object-cover transition-opacity duration-1000"
        />

        {/* Botones navegación */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-2 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-2 transition-colors"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Indicadores */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {clinicImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentImageIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Texto encima */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6">
            <h1 className="text-4xl font-bold mb-4 text-white">Sistema de Gestión Médica</h1>
            <p className="text-xl text-white mb-2">Tecnología avanzada para el cuidado dental</p>
            <p className="text-lg text-white/90">Gestiona citas, pacientes y tratamientos de forma eficiente</p>
          </div>
        </div>
      </div>

      {/* Lado derecho: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Bienvenido</CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Accede a tu cuenta del sistema médico
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {authError && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
