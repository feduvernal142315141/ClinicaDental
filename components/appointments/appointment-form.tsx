"use client";

import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Combobox} from "@/components/ui/combobox";
import {Calendar} from "@/components/ui/calendar";
import {useAuth} from "@/contexts/auth-context";
import {Popover, PopoverContent, PopoverTrigger} from "../ui/popover";
import {CalendarIcon} from "lucide-react";
import {format} from "date-fns";
import {es} from "date-fns/locale";
import {Patient} from "@/lib/entity/patients/patients";
import TextArea from "../ui/textarea";
import {getPatients} from "@/lib/supabase/patients";
import {getDoctors} from "@/lib/supabase/doctors";
import {FormSelect} from "../ui/FormSelect";
import {Controller, useForm} from "react-hook-form";
import {serviceCreateAppointment, serviceGetAvailabilityByDoctor} from "@/lib/services/appointments/appointments";

interface AppointmentFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function AppointmentForm({onSuccess, onCancel}: AppointmentFormProps) {
    const {user} = useAuth();
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; name: string; specialization?: string }[]>([]);
    const [available, setAvailable] = useState<string[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);

    const {control, handleSubmit, watch, setValue} = useForm({
        defaultValues: {
            patient_id: user?.roleName === "patient" ? user.id : "",
            doctor_id: user?.roleName === "doctor" ? user.id : "",
            date: "",
            time: "",
            duration: "30",
            type: "consultation",
            notes: "",
        },
    });

    const formData = watch();

    useEffect(() => {
        const loadPatients = async () => {
            try {
                if (!user?.clinicId) return;
                const allPatients = await getPatients(user.clinicId);
                setPatients(allPatients);
            } catch (error) {
                console.error("Error loading patients:", error);
            } finally {
                setLoadingPatients(false);
            }
        };
        loadPatients();
    }, [user?.clinicId]);

    useEffect(() => {
        const loadDoctors = async () => {
            try {
                if (!user?.clinicId) return;
                const allDoctors = await getDoctors(user.clinicId);
                setDoctors(allDoctors);
            } catch (error) {
                console.error("Error loading doctors:", error);
            } finally {
                setLoadingDoctors(false);
            }
        };
        loadDoctors();
    }, [user?.clinicId]);

    useEffect(() => {
        if (!formData.doctor_id || !formData.date) return;

        const date = new Date(formData.date);
        console.log("date", date.toISOString().split('T')[0]);
        getAvailabilityByDoctor(formData.doctor_id, date.toISOString().split('T')[0])
    }, [formData.doctor_id, formData.date]);

    const getAvailabilityByDoctor = async (doctorId: string, date: string) => {
        const response = await serviceGetAvailabilityByDoctor(doctorId, date)
        if (response?.status == 200) {
            setAvailable(response.data?.availableTime)
        }
    }

    const onSubmit = async (values: any) => {
        setLoading(true);
        try {
            const patient = patients.find((p) => p.id === values.patient_id);
            const doctor = doctors.find((d) => d.id === values.doctor_id);

            if (!patient || !doctor)
                throw new Error("Paciente o doctor no encontrado");

            const response = await serviceCreateAppointment({
                patientId: values.patient_id,
                doctorId: values.doctor_id,
                date: values.date,
                time: values.time,
                duration: parseInt(values.duration, 10),
                status: "scheduled",
                type: values.type,
                notes: values.notes
            })

            if (response?.status == 200) {
                onSuccess();
            }

        } catch (error) {
            console.error("Error creating appointment:", error);
        } finally {
            setLoading(false);
        }
    };

    const patientOptions = patients.map((patient) => ({
        id: patient.id,
        label: `${patient.name} - ${patient.email}`,
    }));

    const doctorOptions = doctors.map((doctor) => ({
        id: doctor.id,
        label: `${doctor.name}${doctor.specialization ? ` - ${doctor.specialization}` : ""}`,
    }));

    function parseLocalDate(dateStr: string): Date {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    console.log(available)
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Nueva Cita</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Paciente */}
                    {user?.roleName !== "patient" && (
                        <div className="space-y-2">
                            <Label>Paciente</Label>
                            {loadingPatients ? (
                                <div className="p-4 text-sm text-muted-foreground">
                                    Cargando pacientes...
                                </div>
                            ) : (
                                <Controller
                                    name="patient_id"
                                    control={control}
                                    rules={{required: "El paciente es obligatorio"}}
                                    render={({field}) => (
                                        <Combobox
                                            options={patientOptions.map((p) => ({
                                                value: p.id,
                                                label: p.label,
                                            }))}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Buscar y seleccionar paciente..."
                                            searchPlaceholder="Buscar por nombre o email..."
                                            emptyText="No se encontraron pacientes."
                                        />
                                    )}
                                />
                            )}
                        </div>
                    )}

                    {user?.roleName !== "doctor" && (
                        <FormSelect
                            name="doctor_id"
                            control={control}
                            label="Doctor"
                            placeholder="Seleccionar doctor"
                            options={doctorOptions}
                            required
                        />
                    )}

                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    {formData.date
                                        ? format(parseLocalDate(formData.date), "PPP", {
                                            locale: es,
                                        })
                                        : "Seleccionar fecha"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={
                                        formData.date ? parseLocalDate(formData.date) : undefined
                                    }
                                    onSelect={(day) => {
                                        if (day) {
                                            const localDate = [
                                                day.getFullYear(),
                                                String(day.getMonth() + 1).padStart(2, "0"),
                                                String(day.getDate()).padStart(2, "0"),
                                            ].join("-");
                                            setValue("date", localDate);
                                            setPopoverOpen(false);
                                        }
                                    }}
                                    disabled={(date: Date) => {
                                        const localStr = [
                                            date.getFullYear(),
                                            String(date.getMonth() + 1).padStart(2, "0"),
                                            String(date.getDate()).padStart(2, "0"),
                                        ].join("-");
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return blockedDates.includes(localStr) || date < today;
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect
                            name="time"
                            control={control}
                            label="Hora"
                            placeholder="Seleccionar hora"
                            options={available.map((t) => ({id: t, label: t}))}
                            required
                        />
                        <FormSelect
                            name="duration"
                            control={control}
                            label="Duración"
                            placeholder="Duración"
                            options={[
                                {id: "15", label: "15 minutos"},
                                {id: "30", label: "30 minutos"},
                                {id: "45", label: "45 minutos"},
                                {id: "60", label: "60 minutos"},
                            ]}
                            required
                        />
                    </div>

                    <FormSelect
                        name="type"
                        control={control}
                        label="Tipo de consulta"
                        placeholder="Seleccionar tipo"
                        options={[
                            {id: "consultation", label: "Consulta"},
                            {id: "follow-up", label: "Seguimiento"},
                            {id: "routine", label: "Rutina"},
                            {id: "emergency", label: "Emergencia"},
                        ]}
                        required
                    />

                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Controller
                            name="notes"
                            control={control}
                            render={({field}) => (
                                <TextArea
                                    {...field}
                                    placeholder="Notas adicionales sobre la cita..."
                                    rows={3}
                                />
                            )}
                        />
                    </div>

                    <div className="flex space-x-4 pt-4">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creando..." : "Crear Cita"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 bg-transparent"
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
