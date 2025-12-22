export interface ApiParams {
    method: string;
    url: string;
    data?: any;
    params?: any;
}

export interface ApiResponse<T = any> {
    data: T;
    message?: string;
    status?: number;
    errors?: Record<string, string[]>;
}

