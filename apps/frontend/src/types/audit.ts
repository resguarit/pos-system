export interface AuditActivity {
  id: number;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: {
    old?: Record<string, any>;
    new?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    url?: string;
    method?: string;
    [key: string]: any;
  } | null;
  batch_uuid: string | null;
  event: string | null;
  created_at: string;
  updated_at: string;
  causer?: {
    id: number;
    person?: {
      id: number;
      first_name: string;
      last_name: string;
      full_name?: string;
    };
  } | null;
  subject?: any;
}

export interface AuditFilters {
  user_id?: number;
  subject_type?: string;
  log_name?: string;
  event?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

export interface AuditStatistics {
  total: number;
  by_subject_type: Record<string, number>;
  by_log_name: Record<string, number>;
  by_event: Record<string, number>;
  top_users: Array<{
    user_id: number;
    user_name: string;
    count: number;
  }>;
}

export interface AuditFilterOptions {
  subject_types: string[];
  log_names: string[];
  users: Array<{
    id: number;
    name: string;
  }>;
}

