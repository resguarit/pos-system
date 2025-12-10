import api from '@/lib/api';

export interface ExpenseCategory {
    id: number;
    name: string;
    description?: string;
    parent_id?: number;
    active: boolean;
    children?: ExpenseCategory[];
}

export interface Employee {
    id: number;
    person_id: number;
    branch_id: number;
    job_title?: string;
    salary: number;
    hire_date?: string;
    status: 'active' | 'inactive' | 'terminated';
    person?: any;
    branch?: any;
}

export interface Expense {
    id: number;
    branch_id: number;
    category_id: number;
    employee_id?: number;
    user_id: number;
    payment_method_id?: number;
    cash_movement_id?: number;
    description: string;
    amount: number;
    date: string;
    due_date?: string;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    is_recurring: boolean;
    recurrence_interval?: string;
    category?: ExpenseCategory;
    employee?: Employee;
    branch?: any;
    payment_method?: any;
    user?: any;
}

export const expensesService = {
    // Expenses
    getExpenses: async (params?: any) => {
        const response = await api.get('/expenses', { params });
        return response.data;
    },
    createExpense: async (data: any) => {
        const response = await api.post('/expenses', data);
        return response.data;
    },
    updateExpense: async (id: number, data: any) => {
        const response = await api.put(`/expenses/${id}`, data);
        return response.data;
    },
    deleteExpense: async (id: number) => {
        const response = await api.delete(`/expenses/${id}`);
        return response.data;
    },

    // Categories
    getCategories: async (params?: any) => {
        const response = await api.get('/expense-categories', { params });
        return response.data;
    },
    createCategory: async (data: any) => {
        const response = await api.post('/expense-categories', data);
        return response.data;
    },
    updateCategory: async (id: number, data: any) => {
        const response = await api.put(`/expense-categories/${id}`, data);
        return response.data;
    },
    deleteCategory: async (id: number) => {
        const response = await api.delete(`/expense-categories/${id}`);
        return response.data;
    },

    // Employees
    getEmployees: async (params?: any) => {
        const response = await api.get('/employees', { params });
        return response.data;
    },
    createEmployee: async (data: any) => {
        const response = await api.post('/employees', data);
        return response.data;
    },
    updateEmployee: async (id: number, data: any) => {
        const response = await api.put(`/employees/${id}`, data);
        return response.data;
    },
    deleteEmployee: async (id: number) => {
        const response = await api.delete(`/employees/${id}`);
        return response.data;
    },

    // Payroll
    generatePayroll: async (data: any) => {
        const response = await api.post('/payroll/generate', data);
        return response.data;
    },
};
