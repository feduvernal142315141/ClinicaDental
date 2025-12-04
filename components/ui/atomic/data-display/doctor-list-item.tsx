import * as React from "react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { cn } from "@/lib/utils/utils";
import { LucideIcon, Users } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/atomic/data-display/badge";

/**
 * DoctorListItem - Atomic component for displaying doctor information
 *
 * A reusable component that displays doctor information with an avatar icon,
 * name, appointment count, and occupancy badge. Designed for lists and rankings.
 *
 * @example
 * // Basic usage
 * <DoctorListItem
 *   name="Dr. García"
 *   appointments={24}
 *   occupancy={85}
 * />
 *
 * @example
 * // With custom icon and threshold
 * <DoctorListItem
 *   name="Dr. Martínez"
 *   appointments={18}
 *   occupancy={72}
 *   icon={Stethoscope}
 *   occupancyThreshold={80}
 * />
 *
 * @example
 * // In a list with mapping
 * <div className="space-y-4">
 *   {doctors.map((doctor, index) => (
 *     <DoctorListItem key={index} {...doctor} />
 *   ))}
 * </div>
 */

export interface DoctorListItemProps {
  /** Doctor's name */
  name: string;

  /** Number of scheduled appointments */
  appointments: number;

  /** Occupancy percentage (0-100) */
  occupancy: number;

  /** Optional Lucide icon for the avatar (defaults to Users) */
  icon?: LucideIcon;

  /** Occupancy threshold for badge variant styling (default: 85) */
  occupancyThreshold?: number;

  /** Additional CSS classes for the container */
  className?: string;

  /** Optional click handler for the entire item */
  onClick?: () => void;
}

/**
 * DoctorListItem Component
 *
 * Displays a doctor's information in a clean, consistent format with:
 * - Avatar icon in a colored circle
 * - Doctor name and appointment count
 * - Occupancy percentage badge (color changes based on threshold)
 */
export function DoctorListItem({
  name,
  appointments,
  occupancy,
  icon: Icon = Users,
  occupancyThreshold = 85,
  className,
  onClick,
}: DoctorListItemProps) {
  const isHighOccupancy = occupancy >= occupancyThreshold;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border rounded-lg",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {appointments} cita{appointments !== 1 ? "s" : ""} programada
            {appointments !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={isHighOccupancy ? "default" : "secondary"}>
          {occupancy}% ocupación
        </Badge>
      </div>
    </div>
  );
}

/**
 * DoctorList - Helper component for rendering multiple DoctorListItem components
 *
 * Provides a consistent spacing wrapper for lists of doctors.
 *
 * @example
 * <DoctorList doctors={doctorData} spacing="md" />
 *
 * @example
 * // With custom click handler
 * <DoctorList
 *   doctors={doctorData}
 *   onDoctorClick={(doctor) => console.log(doctor.name)}
 * />
 */

export interface DoctorListProps {
  /** Array of doctor data objects */
  doctors: Array<{
    name: string;
    appointments: number;
    occupancy: number;
  }>;

  /** Spacing between list items */
  spacing?: "sm" | "md" | "lg";

  /** Optional icon to use for all items */
  icon?: LucideIcon;

  /** Occupancy threshold for badge styling */
  occupancyThreshold?: number;

  /** Click handler that receives the doctor object */
  onDoctorClick?: (doctor: {
    name: string;
    appointments: number;
    occupancy: number;
  }) => void;

  /** Additional CSS classes for the container */
  className?: string;
}

export function DoctorList({
  doctors,
  spacing = "md",
  icon,
  occupancyThreshold,
  onDoctorClick,
  className,
}: DoctorListProps) {
  const spacingClasses = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {doctors.map((doctor, index) => (
        <DoctorListItem
          key={index}
          name={doctor.name}
          appointments={doctor.appointments}
          occupancy={doctor.occupancy}
          icon={icon}
          occupancyThreshold={occupancyThreshold}
          onClick={onDoctorClick ? () => onDoctorClick(doctor) : undefined}
        />
      ))}
    </div>
  );
}
