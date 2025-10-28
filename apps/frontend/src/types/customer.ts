// Tipos para Clientes
export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  person_id: number;
  person: Person;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para formularios de cliente
export interface CreateCustomerData {
  person_id: number;
  email: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerData {
  email?: string;
  phone?: string;
  address?: string;
}

// Tipos para filtros
export interface CustomerFilters {
  search?: string;
  email?: string;
  phone?: string;
}

// Tipos para respuestas de la API
export interface CustomerResponse {
  status: number;
  success: boolean;
  message: string;
  data: Customer | Customer[];
}

// Tipos para paginación
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

