export const defaultSchedule = {
  enabled: false,
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "",
  breakEnd: "",
};

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  description: string;
  licenseNumber: string;
  isActive: boolean;
  schedule: {
    [key: string]: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      breakStart?: string;
      breakEnd?: string;
    };
  };
  createdAt: Date;
  clinic_id?: string;
  user_id?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: "appointments" | "patients" | "doctors" | "settings" | "reports";
}

// Mock data for doctors
export const mockDoctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Ana García",
    email: "ana.garcia@clinica.com",
    phone: "+1 234-567-8901",
    specialty: "Odontología General",
    description:
      "Especialista en odontología general con 10 años de experiencia",
    licenseNumber: "ODO-12345",
    isActive: true,
    schedule: {
      monday: {
        enabled: true,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      tuesday: {
        enabled: true,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      wednesday: {
        enabled: true,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      thursday: {
        enabled: true,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      friday: { enabled: true, startTime: "08:00", endTime: "15:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "13:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "13:00" },
    },
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Dr. Carlos Mendoza",
    email: "carlos.mendoza@clinica.com",
    phone: "+1 234-567-8902",
    specialty: "Ortodoncia",
    description: "Especialista en ortodoncia y ortopedia maxilar",
    licenseNumber: "ODO-12346",
    isActive: true,
    schedule: {
      monday: {
        enabled: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      },
      tuesday: {
        enabled: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      },
      wednesday: { enabled: false, startTime: "09:00", endTime: "18:00" },
      thursday: {
        enabled: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      },
      friday: { enabled: true, startTime: "09:00", endTime: "16:00" },
      saturday: { enabled: true, startTime: "09:00", endTime: "14:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "13:00" },
    },
    createdAt: new Date("2024-02-01"),
  },
];

// Mock permissions
export const mockPermissions: Permission[] = [
  // Appointments
  {
    id: "appointments.view",
    name: "Ver Citas",
    description: "Puede ver las citas programadas",
    category: "appointments",
  },
  {
    id: "appointments.create",
    name: "Crear Citas",
    description: "Puede crear nuevas citas",
    category: "appointments",
  },
  {
    id: "appointments.edit",
    name: "Editar Citas",
    description: "Puede modificar citas existentes",
    category: "appointments",
  },
  {
    id: "appointments.delete",
    name: "Eliminar Citas",
    description: "Puede cancelar/eliminar citas",
    category: "appointments",
  },

  // Patients
  {
    id: "patients.view",
    name: "Ver Pacientes",
    description: "Puede ver información de pacientes",
    category: "patients",
  },
  {
    id: "patients.create",
    name: "Crear Pacientes",
    description: "Puede registrar nuevos pacientes",
    category: "patients",
  },
  {
    id: "patients.edit",
    name: "Editar Pacientes",
    description: "Puede modificar datos de pacientes",
    category: "patients",
  },
  {
    id: "patients.delete",
    name: "Eliminar Pacientes",
    description: "Puede eliminar registros de pacientes",
    category: "patients",
  },

  // Doctors
  {
    id: "doctors.view",
    name: "Ver Doctores",
    description: "Puede ver información de doctores",
    category: "doctors",
  },
  {
    id: "doctors.create",
    name: "Crear Doctores",
    description: "Puede registrar nuevos doctores",
    category: "doctors",
  },
  {
    id: "doctors.edit",
    name: "Editar Doctores",
    description: "Puede modificar datos de doctores",
    category: "doctors",
  },
  {
    id: "doctors.delete",
    name: "Eliminar Doctores",
    description: "Puede eliminar doctores del sistema",
    category: "doctors",
  },

  // Settings
  {
    id: "settings.view",
    name: "Ver Configuración",
    description: "Puede acceder a la configuración",
    category: "settings",
  },
  {
    id: "settings.edit",
    name: "Editar Configuración",
    description: "Puede modificar la configuración del sistema",
    category: "settings",
  },

  // Reports
  {
    id: "reports.view",
    name: "Ver Reportes",
    description: "Puede ver reportes y estadísticas",
    category: "reports",
  },
  {
    id: "reports.export",
    name: "Exportar Reportes",
    description: "Puede exportar reportes en diferentes formatos",
    category: "reports",
  },
];

// Mock roles
export const mockRoles: Role[] = [
  {
    id: "admin",
    name: "Administrador",
    description: "Acceso completo al sistema",
    permissions: mockPermissions,
  },
  {
    id: "doctor",
    name: "Doctor",
    description: "Acceso a citas y pacientes asignados",
    permissions: mockPermissions.filter(
      (p) =>
        p.category === "appointments" ||
        p.category === "patients" ||
        p.id === "reports.view"
    ),
  },
  {
    id: "assistant",
    name: "Asistente",
    description: "Gestión de citas y pacientes",
    permissions: mockPermissions.filter(
      (p) =>
        p.category === "appointments" ||
        (p.category === "patients" && p.id !== "patients.delete")
    ),
  },
  {
    id: "patient",
    name: "Paciente",
    description: "Acceso limitado a sus propias citas",
    permissions: [
      mockPermissions.find((p) => p.id === "appointments.view")!,
      mockPermissions.find((p) => p.id === "appointments.create")!,
    ],
  },
];

// Service functions
export const doctorService = {
  getAllDoctors: (): Promise<Doctor[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockDoctors]), 500);
    });
  },

  getDoctorById: (id: string): Promise<Doctor | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const doctor = mockDoctors.find((d) => d.id === id) || null;
        resolve(doctor);
      }, 300);
    });
  },

  createDoctor: (doctor: Omit<Doctor, "id" | "createdAt">): Promise<Doctor> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newDoctor: Doctor = {
          ...doctor,
          id: Date.now().toString(),
          createdAt: new Date(),
        };
        mockDoctors.push(newDoctor);
        resolve(newDoctor);
      }, 500);
    });
  },

  updateDoctor: (id: string, updates: Partial<Doctor>): Promise<Doctor> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockDoctors.findIndex((d) => d.id === id);
        if (index === -1) {
          reject(new Error("Doctor not found"));
          return;
        }
        mockDoctors[index] = { ...mockDoctors[index], ...updates };
        resolve(mockDoctors[index]);
      }, 500);
    });
  },

  deleteDoctor: (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockDoctors.findIndex((d) => d.id === id);
        if (index === -1) {
          reject(new Error("Doctor not found"));
          return;
        }
        mockDoctors.splice(index, 1);
        resolve();
      }, 500);
    });
  },
};

export const roleService = {
  getAllRoles: (): Promise<Role[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockRoles]), 300);
    });
  },

  getAllPermissions: (): Promise<Permission[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockPermissions]), 300);
    });
  },

  updateRole: (id: string, updates: Partial<Role>): Promise<Role> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockRoles.findIndex((r) => r.id === id);
        if (index === -1) {
          reject(new Error("Role not found"));
          return;
        }
        mockRoles[index] = { ...mockRoles[index], ...updates };
        resolve(mockRoles[index]);
      }, 500);
    });
  },
};
