import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Pause,
  Play
} from 'lucide-react';
import { CurrentAccount, CurrentAccountMovement, PendingSale } from '@/types/currentAccount';
import { CurrentAccountService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { InfinitySymbol } from '@/components/ui/InfinitySymbol';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentAccountActions } from '@/hooks/useCurrentAccountActions';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';

interface CurrentAccountDetailsProps {
  accountId: number;
  onBack: () => void;
}

export function CurrentAccountDetails({ accountId, onBack }: CurrentAccountDetailsProps) {
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [movements, setMovements] = useState<CurrentAccountMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);

  const resizableColumns = useResizableColumns({
    columns: [
      { id: 'fecha', defaultWidth: 120, minWidth: 80 },
      { id: 'tipo', defaultWidth: 150, minWidth: 100 },
      { id: 'descripcion', defaultWidth: 300, minWidth: 150 },
      { id: 'monto', defaultWidth: 150, minWidth: 100 },
      { id: 'balance', defaultWidth: 150, minWidth: 100 },
    ],
    storageKey: 'current-account-movements-columns',
  });

  const { hasPermission } = usePermissions();
  const { suspendAccount, reactivateAccount } = useCurrentAccountActions();

  useEffect(() => {
    loadAccountDetails();
    loadMovements();
    loadPendingSales();
  }, [accountId]);

  const loadAccountDetails = async () => {
    try {
      setLoading(true);
      const accountData = await CurrentAccountService.getById(accountId);
      setAccount(accountData);
    } catch (error) {
      console.error('Error loading account:', error);
      toast.error('Error al cargar los detalles de la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);
      const response = await CurrentAccountService.getMovements(accountId);
      setMovements(response.data);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadPendingSales = async () => {
    try {
      const sales = await CurrentAccountService.getPendingSales(accountId);
      setPendingSales(sales);
    } catch (error) {
      console.error('Error loading pending sales:', error);
      toast.error('Error al cargar ventas pendientes');
    }
  };

  const handleSuspend = async () => {
    if (!account) return;
    await suspendAccount(account, loadAccountDetails);
  };

  const handleReactivate = async () => {
    if (!account) return;
    await reactivateAccount(account, loadAccountDetails);
  };

  const getStatusBadge = (status: string) => {
    const colors = CurrentAccountUtils.getStatusColor(status);
    const statusText = {
      active: 'Activa',
      suspended: 'Suspendida',
      closed: 'Cerrada'
    };

    return (
      <Badge className={colors}>
        {statusText[status as keyof typeof statusText] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Cargando detalles...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No se encontró la cuenta corriente</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPendingDebt = pendingSales.reduce((sum, s) => sum + (s.pending_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {account.customer.person
                ? `${account.customer.person.first_name || ''} ${account.customer.person.last_name || ''}`.trim()
                : 'Sin nombre'}
            </h1>
            <p className="text-muted-foreground">Cuenta Corriente #{account.id}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {hasPermission('suspender_cuentas_corrientes') && account.status === 'active' && (
            <Button variant="outline" onClick={handleSuspend}>
              <Pause className="h-4 w-4 mr-2" />
              Suspender
            </Button>
          )}
          
          {hasPermission('reactivar_cuentas_corrientes') && account.status === 'suspended' && (
            <Button variant="outline" onClick={handleReactivate}>
              <Play className="h-4 w-4 mr-2" />
              Reactivar
            </Button>
          )}
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {getStatusBadge(account.status)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${account.current_balance < 0 ? 'text-red-600' : ''}`}>
              {CurrentAccountUtils.formatCurrency(account.current_balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Límite de Crédito</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {account.credit_limit === null ? (
                <InfinitySymbol size="md" />
              ) : (
                CurrentAccountUtils.formatCurrency(account.credit_limit)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédito Disponible</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {account.available_credit === null ? (
                <InfinitySymbol size="md" />
              ) : (
                <span className={account.available_credit < 0 ? 'text-red-600' : ''}>
                  {CurrentAccountUtils.formatCurrency(account.available_credit)}
                </span>
              )}
            </div>
            {account.credit_usage_percentage !== null && (
              <p className="text-xs text-muted-foreground">
                {CurrentAccountUtils.formatPercentage(account.credit_usage_percentage)} usado
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Adeudado</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPendingDebt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {CurrentAccountUtils.formatCurrency(totalPendingDebt)}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {account.customer.person
                      ? `${account.customer.person.first_name || ''} ${account.customer.person.last_name || ''}`.trim()
                      : 'Sin nombre'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{account.customer.email || 'Sin email'}</span>
                </div>
                {account.customer.person?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{account.customer.person.phone}</span>
                  </div>
                )}
                {account.customer.person?.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{account.customer.person.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de la Cuenta */}
            <Card>
              <CardHeader>
                <CardTitle>Información de la Cuenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Apertura: {account.opened_at ? new Date(account.opened_at).toLocaleDateString('es-AR') : 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Último movimiento: {account.last_movement_at ? new Date(account.last_movement_at).toLocaleDateString('es-AR') : 'Nunca'}</span>
                </div>
                {account.closed_at && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Cierre: {new Date(account.closed_at).toLocaleDateString('es-AR')}</span>
                  </div>
                )}
                {account.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Notas:</p>
                    <p className="text-sm text-muted-foreground">{account.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <ResizableTableHeader
                          columnId="fecha"
                          getResizeHandleProps={resizableColumns.getResizeHandleProps}
                          getColumnHeaderProps={resizableColumns.getColumnHeaderProps}
                        >
                          Fecha
                        </ResizableTableHeader>
                        <ResizableTableHeader
                          columnId="tipo"
                          getResizeHandleProps={resizableColumns.getResizeHandleProps}
                          getColumnHeaderProps={resizableColumns.getColumnHeaderProps}
                        >
                          Tipo
                        </ResizableTableHeader>
                        <ResizableTableHeader
                          columnId="descripcion"
                          getResizeHandleProps={resizableColumns.getResizeHandleProps}
                          getColumnHeaderProps={resizableColumns.getColumnHeaderProps}
                        >
                          Descripción
                        </ResizableTableHeader>
                        <ResizableTableHeader
                          columnId="monto"
                          getResizeHandleProps={resizableColumns.getResizeHandleProps}
                          getColumnHeaderProps={resizableColumns.getColumnHeaderProps}
                        >
                          Monto
                        </ResizableTableHeader>
                        <ResizableTableHeader
                          columnId="balance"
                          getResizeHandleProps={resizableColumns.getResizeHandleProps}
                          getColumnHeaderProps={resizableColumns.getColumnHeaderProps}
                        >
                          Balance
                        </ResizableTableHeader>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {movements.map((movement) => (
                        <tr key={movement.id}>
                          <ResizableTableCell
                            columnId="fecha"
                            getColumnCellProps={resizableColumns.getColumnCellProps}
                          >
                            {movement.movement_date ? 
                              new Date(movement.movement_date).toLocaleDateString('es-AR') :
                              new Date(movement.created_at).toLocaleDateString('es-AR')
                            }
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="tipo"
                            getColumnCellProps={resizableColumns.getColumnCellProps}
                          >
                            {movement.movement_type.name}
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="descripcion"
                            getColumnCellProps={resizableColumns.getColumnCellProps}
                          >
                            {movement.description}
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="monto"
                            getColumnCellProps={resizableColumns.getColumnCellProps}
                            className={movement.is_inflow ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}
                          >
                            {movement.is_inflow ? '+' : '-'}{CurrentAccountUtils.formatCurrency(movement.amount)}
                          </ResizableTableCell>
                          <ResizableTableCell
                            columnId="balance"
                            getColumnCellProps={resizableColumns.getColumnCellProps}
                          >
                            {CurrentAccountUtils.formatCurrency(movement.balance_after)}
                          </ResizableTableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
