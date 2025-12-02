"use client"

import {useState} from "react"
import {useAuth} from "@/contexts/auth-context"
import {LoginForm} from "@/components/auth/login-form"
import {Sidebar} from "@/components/layout/sidebar"
import {MobileHeader} from "@/components/layout/mobile-header"
import {CalendarView} from "@/components/appointments/calendar-view"
import {AppointmentDetails} from "@/components/appointments/appointment-details"
import type {Appointment} from "@/lib/entity/appointment/appointments"
import {PatientForm} from "@/components/patients/patient-form"
import {PatientDetails} from "@/components/patients/patient-details"
import type {Patient} from "@/lib/entity/patients/patients"
import {OverviewSection} from "@/components/dashboard/overview-section"
import {ProductivitySection} from "@/components/dashboard/productivity-section"
import {PatientsSection} from "@/components/dashboard/patients-section"
import {SettingsPage} from "@/components/settings/settings-page"
import {AppointmentFormWithSidebar} from "@/components/appointments/appointment-form-with-sidebar"
import {PatientTabs} from "@/components/patients/patient-tabs"

function DashboardContent({userRole}: { userRole?: string }) {
    return (
        <div className="space-y-8">
            <OverviewSection/>
            <ProductivitySection/>
            <PatientsSection/>
        </div>
    )
}

function MainContent({activeSection, userRole}: { activeSection: string; userRole?: string }) {
    const [showAppointmentForm, setShowAppointmentForm] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const [showPatientForm, setShowPatientForm] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [patientRefreshKey, setPatientRefreshKey] = useState(0)

    const handleAppointmentSuccess = () => {
        setShowAppointmentForm(false)
        setRefreshKey((prev) => prev + 1)
    }

    const handleAppointmentUpdate = () => {
        setSelectedAppointment(null)
        setRefreshKey((prev) => prev + 1)
    }

    const handlePatientSuccess = () => {
        setShowPatientForm(false)
        setEditingPatient(null)
        setPatientRefreshKey((prev) => prev + 1)
    }

    const handleNewPatient = () => {
        setEditingPatient(null)
        setShowPatientForm(true)
    }

    const handleEditPatient = (patient: Patient) => {
        setEditingPatient(patient)
        setShowPatientForm(true)
    }

    const handleViewPatient = (patient: Patient) => {
        setSelectedPatient(patient)
    }

    const handlePatientCancel = () => {
        setShowPatientForm(false)
        setEditingPatient(null)
    }

    const handlePatientClose = () => {
        setSelectedPatient(null)
    }

    switch (activeSection) {
        case "dashboard":
            return <DashboardContent userRole={userRole}/>
        case "appointments":
            if (showAppointmentForm) {
                return <AppointmentFormWithSidebar
                    onSuccess={handleAppointmentSuccess}
                    onCancel={() => setShowAppointmentForm(false)}
                />
            }

            if (selectedAppointment) {
                return (
                    <AppointmentDetails
                        appointment={selectedAppointment}
                        onClose={() => setSelectedAppointment(null)}
                        onUpdate={handleAppointmentUpdate}
                    />
                )
            }

            return (
                <CalendarView
                    key={refreshKey}
                    onNewAppointment={() => setShowAppointmentForm(true)}
                    onAppointmentClick={setSelectedAppointment}
                />
            )
        case "users":
            if (showPatientForm) {
                return <PatientForm patient={editingPatient} onSuccess={handlePatientSuccess}
                                    onCancel={handlePatientCancel}/>
            }

            if (selectedPatient) {
                return <PatientDetails patient={selectedPatient} onEdit={handleEditPatient}
                                       onClose={handlePatientClose}/>
            }

            return (
                <PatientTabs/>
            )
        case "settings":
            return <SettingsPage/>
        default:
            return <DashboardContent userRole={userRole}/>
    }
}

export default function HomePage() {
    const {user, loading} = useAuth()
    const [activeSection, setActiveSection] = useState("dashboard")
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen)
    }

    const closeSidebar = () => {
        setIsSidebarOpen(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginForm/>
    }
    return (
        <div className="min-h-screen bg-background">
            <MobileHeader isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar}/>

            <div className="flex h-screen lg:h-screen">
                <Sidebar
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                />

                <main className="flex-1 p-4 lg:p-6 overflow-auto pt-0 lg:pt-6">
                    <MainContent activeSection={activeSection} userRole={user.roleName}/>
                </main>
            </div>
        </div>
    )
}
