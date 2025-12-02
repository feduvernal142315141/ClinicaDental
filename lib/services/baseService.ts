
import apiInstance from "@/lib/services/apiConfig";
import {ResponseEntity, ServiceResponse} from "@/lib/models/response";

export const serviceGet = async <T = any>(url: string): ServiceResponse<T> => {
    return apiInstance
        .get<ResponseEntity<T>>(url)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const serviceDelete = async <T = any, R = any>(url: string, data?: T): ServiceResponse<R> => {
    return apiInstance
        .delete<ResponseEntity<R>>(url, { data })
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const servicePost = async <T = any, R = any>(url: string, data: T): ServiceResponse<R> => {
    return apiInstance
        .post<ResponseEntity<R>>(url, data)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const servicePut = async <T = any, R = any>(url: string, data: T): ServiceResponse<R> => {
    return apiInstance
        .put<ResponseEntity<R>>(url, data)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

