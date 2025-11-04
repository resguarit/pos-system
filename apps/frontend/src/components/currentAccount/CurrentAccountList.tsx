import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { usePendingSalesData } from '@/hooks/usePendingSalesData';
import { toast } from 'sonner';
import { Eye, Pause, Play, CreditCard, DollarSign, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CurrentAccount, CurrentAccountFilters, PaginatedResponse } from '@/types/currentAccount';
import { CurrentAccountService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { InfinitySymbol } from '@/components/ui/InfinitySymbol';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentAccountActions } from '@/hooks/useCurrentAccountActions';

interface CurrentAccountListProps {
  onEdit: (account: CurrentAccount) => void;
  onView: (account: CurrentAccount) => void;
  onCreate: () => void;
  onPayment: (account: CurrentAccount) => void;
  initialSearchTerm?: string;
  initialStatusFilter?: string;
  initialBalanceFilter?: string;
}

export function CurrentAccountList({ 
  onEdit, 
  onView, 
  onCreate, 
  onPayment, 
  initialSearchTerm = '', 
  initialStatusFilter = '', 
  initialBalanceFilter = '' 
}: CurrentAccountListProps) {
  const [accounts, setAccounts] = useState<CurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });
  
  const { hasPermission } = usePermissions();
  const { 
    suspendAccount, 
    reactivateAccount, 
    closeAccount, 
    deleteAccount 
  } = useCurrentAccountActions();

  // Memoizar IDs de cuentas para el hook de ventas pendientes
  const accountIds = useMemo(() => accounts.map(account => account.id), [accounts]);
  
  // Hook para cargar ventas pendientes
  const { getPendingDebt, isLoading: isPendingSalesLoading } = usePendingSalesData(accountIds);

  // Configuración de columnas según especificación del usuario
  const columnConfig = [
    { id: 'client', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'credit_limit', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'current_balance', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'available_credit', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
    { id: 'last_movement', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'actions', minWidth: 180, maxWidth: 220, defaultWidth: 200 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'cuentas-corrientes-column-widths',
    defaultWidth: 150
  });

  const loadAccounts = useCallback(async (searchTerm = '', statusFilter = '', balanceFilter = '', page = 1) => {
    try {
      setLoading(true);
      const filters: CurrentAccountFilters = {
        page,
        per_page: 10
      };
      
      // Aplicar filtros si están presentes
      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }
      if (balanceFilter) {
        // Mapear balanceFilter a los campos existentes
        // IMPORTANTE: En este sistema, balance POSITIVO = cliente debe dinero (deuda)
        // Balance NEGATIVO = cliente tiene saldo a favor (crédito disponible)
        switch (balanceFilter) {
          case 'positive':
            // Con crédito disponible = cuentas con crédito infinito (credit_limit = NULL)
            filters.balance_filter = 'positive';
            break;
          case 'negative':
            // Con deuda = balance positivo (> 0) O tiene ventas pendientes
            filters.balance_filter = 'negative';
            break;
          case 'at_limit':
            // Al límite = requiere lógica especial en backend
            filters.balance_filter = 'at_limit';
            break;
          case 'overdrawn':
            // Sobregiradas = excedieron el límite de crédito
            filters.balance_filter = 'overdrawn';
            break;
        }
      }
      
      const response: PaginatedResponse<CurrentAccount> = await CurrentAccountService.getAll(filters);
      setAccounts(response.data);
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        per_page: response.per_page,
        total: response.total,
        from: response.from,
        to: response.to
      });
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Error al cargar las cuentas corrientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter);
  }, [initialSearchTerm, initialStatusFilter, initialBalanceFilter, loadAccounts]);

  const handlePageChange = useCallback((newPage: number) => {
    loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter, newPage);
  }, [loadAccounts, initialSearchTerm, initialStatusFilter, initialBalanceFilter]);

  const handleSuspend = useCallback(async (account: CurrentAccount) => {
    await suspendAccount(account, () => loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page));
  }, [suspendAccount, loadAccounts, initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page]);

  const handleReactivate = useCallback(async (account: CurrentAccount) => {
    await reactivateAccount(account, () => loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page));
  }, [reactivateAccount, loadAccounts, initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page]);

  const handleClose = useCallback(async (account: CurrentAccount) => {
    await closeAccount(account, () => loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page));
  }, [closeAccount, loadAccounts, initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page]);

  const handleDelete = useCallback(async (account: CurrentAccount) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta corriente?')) {
      return;
    }
    await deleteAccount(account, () => loadAccounts(initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page));
  }, [deleteAccount, loadAccounts, initialSearchTerm, initialStatusFilter, initialBalanceFilter, pagination.current_page]);

  // Función para obtener la inicial del nombre
  const getInitial = useCallback((name: string | undefined) => {
    if (!name || name.trim() === '') {
      return '?';
    }
    return name.charAt(0).toUpperCase();
  }, []);

  // Función para renderizar el saldo adeudado
  const renderPendingDebt = useCallback((accountId: number) => {
    const pendingDebt = getPendingDebt(accountId);
    const isLoadingDebt = isPendingSalesLoading(accountId);

    if (isLoadingDebt) {
      return (
        <div className="flex items-center justify-end">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <span className={`font-medium ${
        pendingDebt > 0 ? 'text-red-600' : 'text-green-600'
      }`}>
        {CurrentAccountUtils.formatCurrency(pendingDebt)}
      </span>
    );
  }, [getPendingDebt, isPendingSalesLoading]);

  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      active: {
        text: 'Activo',
        className: 'bg-green-50 text-green-800 border-green-100'
      },
      suspended: {
        text: 'Suspendida',
        className: 'bg-yellow-50 text-yellow-800 border-yellow-100'
      },
      closed: {
        text: 'Cerrada',
        className: 'bg-red-50 text-red-800 border-red-100'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      text: status,
      className: 'bg-gray-50 text-gray-800 border-gray-100'
    };

    return (
      <Badge className={`${config.className} border`}>
        {config.text}
      </Badge>
    );
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filtros skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="h-10 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse"></div>
        </div>
        
        {/* Tabla skeleton */}
        <div className="rounded-md border">
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="rounded-md border bg-card">
      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay cuentas corrientes</h3>
          <p className="text-muted-foreground mb-4">
            Las cuentas corrientes se crean automáticamente al crear clientes
          </p>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Ve a la sección <strong>Clientes</strong> para crear nuevos clientes
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Table ref={tableRef} className="w-full">
            <TableHeader>
              <TableRow>
                <ResizableTableHeader
                  columnId="client"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  CLIENTE
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="status"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  ESTADO
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="credit_limit"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  LÍMITE DE CRÉDITO
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="current_balance"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  BALANCE
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="available_credit"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  CRÉDITO DISPONIBLE
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="last_movement"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                  className="hidden md:table-cell"
                >
                  ÚLTIMO MOVIMIENTO
                </ResizableTableHeader>
                <ResizableTableHeader
                  columnId="actions"
                  getResizeHandleProps={getResizeHandleProps}
                  getColumnHeaderProps={getColumnHeaderProps}
                >
                  ACCIONES
                </ResizableTableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                // Validación robusta de datos
                const customerName = account.customer?.person 
                  ? `${account.customer.person.first_name || ''} ${account.customer.person.last_name || ''}`.trim() 
                  : 'Cliente sin nombre';
                const customerEmail = account.customer?.email || 'Sin email';
                
                return (
                  <TableRow key={account.id}>
                    <ResizableTableCell
                      columnId="client"
                      getColumnCellProps={getColumnCellProps}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-bold text-primary">
                            {getInitial(customerName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{customerName}</div>
                          <div className="text-sm text-muted-foreground">{customerEmail}</div>
                        </div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="status"
                      getColumnCellProps={getColumnCellProps}
                    >
                      {getStatusBadge(account.status)}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="credit_limit"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell text-right text-sm"
                    >
                      {account.credit_limit === null ? (
                        <InfinitySymbol size="xs" />
                      ) : (
                        CurrentAccountUtils.formatCreditLimit(account.credit_limit)
                      )}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="current_balance"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell text-right text-sm"
                    >
                      {/* Mostrar balance real: positivo = deuda, negativo = crédito a favor */}
                      <span className={`font-medium ${
                        account.current_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {CurrentAccountUtils.formatCurrency(account.current_balance || 0)}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="available_credit"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell text-right text-sm"
                    >
                      {account.available_credit === null ? (
                        <InfinitySymbol size="xs" />
                      ) : (
                        <span className={account.available_credit < 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {CurrentAccountUtils.formatCurrency(account.available_credit)}
                        </span>
                      )}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="last_movement"
                      getColumnCellProps={getColumnCellProps}
                      className="hidden md:table-cell text-sm"
                    >
                      {account.last_movement_at ? (
                        <span className="text-muted-foreground">
                          {new Date(account.last_movement_at).toLocaleDateString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nunca</span>
                      )}
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="actions"
                      getColumnCellProps={getColumnCellProps}
                    >
                      <div className="flex items-center space-x-2">
                        {hasPermission('gestionar_cuentas_corrientes') && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onView(account)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Ver detalles de la cuenta"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {account.status === 'active' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => onPayment(account)}
                                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  title="Registrar pago"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSuspend(account)}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title="Suspender cuenta"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {account.status === 'suspended' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleReactivate(account)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Reactivar cuenta"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </ResizableTableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginación */}
      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Mostrando {pagination.from} a {pagination.to} de {pagination.total} resultados
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const pageNumber = Math.max(1, pagination.current_page - 2) + i;
                if (pageNumber > pagination.last_page) return null;
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === pagination.current_page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page >= pagination.last_page}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
