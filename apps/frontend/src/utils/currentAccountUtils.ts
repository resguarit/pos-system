import { CurrentAccount, PendingSale } from '@/types/currentAccount';
import { CurrentAccountUtils as ServiceUtils } from '@/lib/services/currentAccountService';

/**
 * Calcula el saldo adeudado basado en el balance real de la cuenta
 * 
 * @param account - Cuenta corriente
 * @returns Saldo adeudado (balance positivo) o 0 si no hay deuda
 */
export function calculateOutstandingBalance(account: CurrentAccount | null): number {
  if (!account) return 0;
  return Math.max(0, account.current_balance || 0);
}

/**
 * Calcula el total de ventas pendientes
 * 
 * @param pendingSales - Array de ventas pendientes
 * @returns Suma total de montos pendientes
 */
export function calculateTotalPendingSales(pendingSales: PendingSale[]): number {
  return pendingSales.reduce((sum, sale) => sum + (sale.pending_amount || 0), 0);
}

/**
 * Obtiene el mensaje descriptivo del estado del saldo adeudado
 * 
 * @param balance - Balance actual de la cuenta
 * @param totalPendingSales - Total de ventas pendientes
 * @returns Mensaje descriptivo
 */
export function getOutstandingBalanceDescription(
  balance: number,
  totalPendingSales: number
): string {
  if (balance > 0) {
    return balance !== totalPendingSales
      ? 'Incluye todos los movimientos (ventas, pagos, ajustes)'
      : 'Monto que el cliente debe';
  }
  
  if (balance < 0) {
    return 'Cliente tiene crédito a favor';
  }
  
  return 'Cuenta saldada';
}

/**
 * Formatea el balance para mostrar en la UI
 * Solo muestra valores positivos (deuda), muestra $0,00 si no hay deuda
 * 
 * @param balance - Balance a formatear
 * @returns String formateado con el balance o $0,00
 */
export function formatOutstandingBalance(balance: number): string {
  if (balance > 0) {
    return ServiceUtils.formatCurrency(balance);
  }
  return '$0,00';
}

/**
 * Obtiene la clase CSS para el color del balance según su valor
 * 
 * @param balance - Balance a evaluar
 * @returns Clase CSS para el color
 */
export function getBalanceColorClass(balance: number): string {
  return balance > 0 ? 'text-red-600' : 'text-green-600';
}

