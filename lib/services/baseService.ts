
import apiInstance from "@/lib/services/apiConfig";
import {ResponseEntity, ServiceResponse} from "@/lib/models/response";
import type {SearchRequest} from "@/lib/query";

export const serviceGet = async <T = unknown>(url: string): ServiceResponse<T> => {
    return apiInstance
        .get<ResponseEntity<T>>(url)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const serviceDelete = async <T = unknown, R = unknown>(url: string, data?: T): ServiceResponse<R> => {
    return apiInstance
        .delete<ResponseEntity<R>>(url, { data })
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const servicePost = async <T = unknown, R = unknown>(url: string, data: T): ServiceResponse<R> => {
    return apiInstance
        .post<ResponseEntity<R>>(url, data)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const servicePut = async <T = unknown, R = unknown>(url: string, data: T): ServiceResponse<R> => {
    return apiInstance
        .put<ResponseEntity<R>>(url, data)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

export const servicePatch = async <T = unknown, R = unknown>(url: string, data?: T): ServiceResponse<R> => {
    return apiInstance
        .patch<ResponseEntity<R>>(url, data)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

/**
 * Ejecutor de búsqueda por ÁRBOL booleano (Fase 3): POST `${endpoint}/search` con un
 * {@link SearchRequest}. Reutilizable por cualquier dominio que exponga el endpoint /search.
 * Devuelve la ServiceResponse cruda; cada service la desempaqueta con su handleServiceError.
 */
export const searchTree = async <R = unknown>(endpoint: string, body: SearchRequest): ServiceResponse<R> => {
    return apiInstance
        .post<ResponseEntity<R>>(`${endpoint}/search`, body)
        .then((response) => {
            return response
        })
        .catch((err) => {
            return err.response
        })
}

