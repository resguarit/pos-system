import api from '@/lib/api';
import type {
  CurrentAccount,
  CurrentAccountMovement,
  MovementType,
  CreateCurrentAccountData,
  UpdateCurrentAccountData,
  CreateMovementData,
  ProcessPaymentData,
  ProcessCreditPurchaseData,
  UpdateCreditLimitData,
  CurrentAccountFilters,
  MovementFilters,
  CurrentAccountStatistics,
  GeneralStatistics,
  CurrentAccountReport,
  PaginatedResponse,
  ExportData,
  PendingSale,
  ProcessPaymentBySaleData
} from '@/types/currentAccount';

export class CurrentAccountService {
  private static baseUrl = '/current-accounts';

  // Helper para manejar respuestas de la API
  private static handleResponse<T>(response: any): T {
    return response.data.data || response.data;
  }

  // CRUD básico de cuentas corrientes
  static async getAll(filters?: CurrentAccountFilters): Promise<PaginatedResponse<CurrentAccount>> {
    const response = await api.get(this.baseUrl, { params: filters });
    return this.handleResponse(response);
  }

  static async getById(id: number): Promise<CurrentAccount> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return this.handleResponse(response);
  }

  static async create(data: CreateCurrentAccountData): Promise<CurrentAccount> {
    const response = await api.post(this.baseUrl, data);
    return this.handleResponse(response);
  }

  static async update(id: number, data: UpdateCurrentAccountData): Promise<CurrentAccount> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return this.handleResponse(response);
  }

  static async delete(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // Gestión de estado de cuentas
  static async suspend(id: number, reason?: string): Promise<CurrentAccount> {
    const response = await api.patch(`${this.baseUrl}/${id}/suspend`, { reason });
    return this.handleResponse(response);
  }

  static async reactivate(id: number): Promise<CurrentAccount> {
    const response = await api.patch(`${this.baseUrl}/${id}/reactivate`);
    return this.handleResponse(response);
  }

  static async close(id: number, reason?: string): Promise<CurrentAccount> {
    const response = await api.patch(`${this.baseUrl}/${id}/close`, { reason });
    return this.handleResponse(response);
  }

  // Consultas específicas
  static async getByCustomer(customerId: number): Promise<CurrentAccount | null> {
    const response = await api.get(`${this.baseUrl}/customer/${customerId}`);
    return this.handleResponse(response);
  }

  static async getByStatus(status: string): Promise<CurrentAccount[]> {
    const response = await api.get(`${this.baseUrl}/status/${status}`);
    return this.handleResponse(response);
  }

  static async getAtCreditLimit(): Promise<CurrentAccount[]> {
    const response = await api.get(`${this.baseUrl}/at-credit-limit`);
    return this.handleResponse(response);
  }

  static async getOverdrawn(): Promise<CurrentAccount[]> {
    const response = await api.get(`${this.baseUrl}/overdrawn`);
    return this.handleResponse(response);
  }

  // Gestión de movimientos
  static async getMovements(accountId: number, filters?: MovementFilters): Promise<PaginatedResponse<CurrentAccountMovement>> {
    const response = await api.get(`${this.baseUrl}/${accountId}/movements`, { params: filters });
    return this.handleResponse(response);
  }

  static async createMovement(data: CreateMovementData): Promise<CurrentAccountMovement> {
    const response = await api.post(`${this.baseUrl}/movements`, data);
    return this.handleResponse(response);
  }

  static async getBalance(accountId: number): Promise<number> {
    const response = await api.get(`${this.baseUrl}/${accountId}/balance`);
    const data = this.handleResponse(response) as { balance: number };
    return data.balance;
  }

  // Operaciones financieras
  static async processPayment(accountId: number, data: ProcessPaymentData): Promise<CurrentAccountMovement> {
    const response = await api.post(`${this.baseUrl}/${accountId}/payments`, data);
    return this.handleResponse(response);
  }

  static async processCreditPurchase(accountId: number, data: ProcessCreditPurchaseData): Promise<CurrentAccountMovement> {
    const response = await api.post(`${this.baseUrl}/${accountId}/credit-purchases`, data);
    return this.handleResponse(response);
  }

  static async checkAvailableCredit(accountId: number, amount: number): Promise<boolean> {
    const response = await api.post(`${this.baseUrl}/${accountId}/check-credit`, { amount });
    const data = this.handleResponse(response) as { available: boolean };
    return data.available;
  }

  // Ventas pendientes y pagos
  static async getPendingSales(accountId: number): Promise<PendingSale[]> {
    const response = await api.get(`${this.baseUrl}/${accountId}/pending-sales`);
    return this.handleResponse(response) as PendingSale[];
  }

  static async processPaymentBySale(accountId: number, data: ProcessPaymentBySaleData): Promise<any> {
    const response = await api.post(`${this.baseUrl}/${accountId}/payments`, data);
    return this.handleResponse(response);
  }

  // Gestión de límites
  static async updateCreditLimit(accountId: number, data: UpdateCreditLimitData): Promise<CurrentAccount> {
    const response = await api.patch(`${this.baseUrl}/${accountId}/credit-limit`, data);
    return this.handleResponse(response);
  }

  // Estadísticas y reportes
  static async getStatistics(accountId: number): Promise<CurrentAccountStatistics> {
    const response = await api.get(`${this.baseUrl}/${accountId}/statistics`);
    return this.handleResponse(response);
  }

  static async getGeneralStatistics(): Promise<GeneralStatistics> {
    const response = await api.get(`${this.baseUrl}/statistics/general`);
    return this.handleResponse(response);
  }

  static async exportMovements(accountId: number, filters?: MovementFilters): Promise<ExportData> {
    const response = await api.get(`${this.baseUrl}/${accountId}/export-movements`, { params: filters });
    return this.handleResponse(response);
  }

  static async generateReport(filters?: { status?: string; from_date?: string; to_date?: string }): Promise<CurrentAccountReport> {
    const response = await api.get(`${this.baseUrl}/reports/generate`, { params: filters });
    return this.handleResponse(response);
  }
}

// Servicio para tipos de movimiento
export class MovementTypeService {
  private static baseUrl = '/movement-types';

  // Helper para manejar respuestas de la API
  private static handleResponse<T>(response: any): T {
    return response.data.data || response.data;
  }

  static async getAll(): Promise<MovementType[]> {
    const response = await api.get(this.baseUrl);
    return this.handleResponse(response);
  }

  static async getCurrentAccountTypes(): Promise<MovementType[]> {
    const allTypes = await this.getAll();
    return allTypes.filter(type => type.is_current_account_movement);
  }

  static async getInflowTypes(): Promise<MovementType[]> {
    const allTypes = await this.getAll();
    return allTypes.filter(type => 
      type.is_current_account_movement && type.operation_type === 'entrada'
    );
  }

  static async getOutflowTypes(): Promise<MovementType[]> {
    const allTypes = await this.getAll();
    return allTypes.filter(type => 
      type.is_current_account_movement && type.operation_type === 'salida'
    );
  }
}

// Utilidades para formateo y validación
export class CurrentAccountUtils {
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatCreditLimit(limit: number | null): string {
    if (limit === null || limit === undefined) {
      return '∞'; // Símbolo de infinito más grande
    }
    return this.formatCurrency(limit);
  }

  static formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'suspended':
        return 'text-yellow-600 bg-yellow-100';
      case 'closed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  static getStatusIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'check-circle';
      case 'suspended':
        return 'pause-circle';
      case 'closed':
        return 'x-circle';
      default:
        return 'question-mark-circle';
    }
  }

  static getOperationTypeColor(operationType: string): string {
    switch (operationType) {
      case 'entrada':
        return 'text-green-600 bg-green-100';
      case 'salida':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  static validateCreditLimit(limit: number): boolean {
    return limit >= 0 && limit <= 999999.99;
  }

  static validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999.99;
  }

  static calculateCreditUsagePercentage(currentBalance: number, creditLimit: number): number {
    if (creditLimit <= 0) return 0;
    return Math.min(100, (currentBalance / creditLimit) * 100);
  }

  static isOverdrawn(currentBalance: number, creditLimit: number): boolean {
    return currentBalance > creditLimit;
  }

  static isAtCreditLimit(currentBalance: number, creditLimit: number): boolean {
    return currentBalance >= creditLimit;
  }

  static hasAvailableCredit(currentBalance: number, creditLimit: number, requestedAmount: number): boolean {
    return (currentBalance + requestedAmount) <= creditLimit;
  }
}
