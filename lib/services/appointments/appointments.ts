import {serviceGet, servicePost} from "@/lib/services/baseService";
import {ServiceResponse} from "@/lib/models/response";
import {AvailabilityResponse, RequestCreateAppointment} from "@/lib/entity/appointment/appointments";


export const serviceGetAvailabilityByDoctor = async (
    doctorId: string, 
    date: string
): ServiceResponse<AvailabilityResponse> => {
    return serviceGet<AvailabilityResponse>(
        `/appointments/availability/doctor/${doctorId}?date=${date}&interval=${15}`
    )
}

export const serviceCreateAppointment = async (
    appointment: RequestCreateAppointment): ServiceResponse<string> => {
    return servicePost<RequestCreateAppointment,string>(
        `/appointments`,
        appointment
    )
}