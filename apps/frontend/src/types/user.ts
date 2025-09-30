export interface User {
  id: string;
  email: string;
  username: string;
  active: boolean;
  person?: {
    id: number;
    first_name: string;
    last_name: string;
    documento?: string;
    cuit?: string;
  };
  role?: {
    id: number;
    name: string;
    description?: string;
    is_system?: boolean;
  };
  permissions: string[];
  branches?: Branch[];
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  color?: string;
  status?: number;
  point_of_sale?: string;
  manager_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  permissions: string[];
}

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system?: boolean;
  active?: boolean;
  permissions?: Permission[];
  permissions_count?: number;
  created_at?: string;
  updated_at?: string;
}
