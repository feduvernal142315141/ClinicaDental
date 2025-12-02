import {AxiosResponse} from "axios";

export type ResponseEntity<T> = {
    code?: string;
    message?: string;
    details?: string;
} & T;

// Type alias para simplificar las firmas de los servicios
export type ServiceResponse<T> = Promise<AxiosResponse<ResponseEntity<T>>>;