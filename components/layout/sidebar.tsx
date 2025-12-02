"use client"

import {useAuth} from "@/contexts/auth-context"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {Calendar, Users, Settings, LogOut, Stethoscope, UserCheck, ClipboardList, BookImage, FileText} from "lucide-react"
import {useEffect} from "react"
import Link from "next/link"

interface SidebarProps {
    activeSection: string
    onSectionChange: (section: string) => void
    isOpen: boolean
    onClose: () => void
}

export function Sidebar({activeSection, onSectionChange, isOpen, onClose}: SidebarProps) {
    const {user, logout} = useAuth()

    const getMenuItems = () => {
        switch (user?.roleName) {
            case "admin":
                return [
                    {id: "dashboard", label: "Dashboard", icon: ClipboardList},
                    {id: "users", label: "Pacientes", icon: Users},
                    {id: "appointments", label: "Citas", icon: Calendar},
                    {id: "settings", label: "Configuración", icon: Settings},
                ]
            case "doctor":
                return [
                    {id: "dashboard", label: "Dashboard", icon: Stethoscope},
                    {id: "appointments", label: "Mis Citas", icon: Calendar},
                    {id: "users", label: "Pacientes", icon: UserCheck},
                    // { id: "settings", label: "Configuración", icon: Settings },
                ]
            case "patient":
                return [
                    {id: "dashboard", label: "Dashboard", icon: UserCheck},
                    {id: "appointments", label: "Mis Citas", icon: Calendar},
                    {id: "history", label: "Historial", icon: ClipboardList},
                    // { id: "settings", label: "Configuración", icon: Settings },
                ]
            default:
                return []
        }
    }

    useEffect(() => {
        console.log("User role:", user)
    }, [user])

    const menuItems = getMenuItems()

    const handleSectionChange = (section: string) => {
        onSectionChange(section)
        onClose()
    }

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose}/>}

            <div
                className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        transform ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        transition-transform duration-300 ease-in-out lg:transition-none
        w-64 lg:w-64
      `}
            >
                <Card className="w-full h-full p-4 lg:rounded-lg rounded-none">
                    <div className="flex flex-col h-full">
                        <div className="mb-6 hidden lg:block">
                            <h2 className="text-lg font-semibold text-primary">Sistema Médico</h2>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user?.roleName}</p>
                        </div>

                        <nav className="flex-1 space-y-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <Button
                                        key={item.id}
                                        variant={activeSection === item.id ? "default" : "ghost"}
                                        className="w-full justify-start"
                                        onClick={() => handleSectionChange(item.id)}
                                    >
                                        <Icon className="mr-2 h-4 w-4"/>
                                        {item.label}
                                    </Button>
                                )
                            })}
                            
                            {/* Links con navegación real para admins */}
                            {user?.roleName === "admin" && (
                                <>
                                    <Link href="/campaigns" onClick={onClose}>
                                        <Button
                                            variant={activeSection === "campaigns" ? "default" : "ghost"}
                                            className="w-full justify-start"
                                        >
                                            <BookImage className="mr-2 h-4 w-4"/>
                                            Campañas
                                        </Button>
                                    </Link>
                                    <Link href="/template-demo" onClick={onClose}>
                                        <Button
                                            variant={activeSection === "templates" ? "default" : "ghost"}
                                            className="w-full justify-start"
                                        >
                                            <FileText className="mr-2 h-4 w-4"/>
                                            Templates
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </nav>

                        <Button variant="outline" className="w-full justify-start mt-4 bg-transparent" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4"/>
                            Cerrar Sesión
                        </Button>
                    </div>
                </Card>
            </div>
        </>
    )
}
