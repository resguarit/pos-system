import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  AlertTriangle,
  Search,
  Download,
  User,
  BarChart3
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { CurrentAccount, GeneralStatistics } from '@/types/currentAccount';
import { CurrentAccountService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { CurrentAccountList } from '@/components/currentAccount/CurrentAccountList';
import { CurrentAccountForm } from '@/components/currentAccount/CurrentAccountForm';
import { CurrentAccountDetails } from '@/components/currentAccount/CurrentAccountDetails';
import { PaymentDialog } from '@/components/currentAccount/PaymentDialog';
import { usePermissions } from '@/hooks/usePermissions';

type ViewMode = 'list' | 'details' | 'form';

export default function CurrentAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAccount, setSelectedAccount] = useState<CurrentAccount | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [statistics, setStatistics] = useState<GeneralStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const { hasPermission } = usePermissions();

  // Manejar filtro inicial desde URL
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setSearchTerm(decodeURIComponent(filterParam));
      // Limpiar el parámetro de la URL después de aplicarlo
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoadingStats(true);
      const stats = await CurrentAccountService.getGeneralStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Error al cargar las estadísticas. Verifica tu conexión e intenta nuevamente.');
      setStatistics(null); // Asegurar que no queden datos previos
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCreateAccount = () => {
    setSelectedAccount(null);
    setViewMode('form');
  };

  const handleEditAccount = (account: CurrentAccount) => {
    setSelectedAccount(account);
    setViewMode('form');
  };

  const handleViewAccount = (account: CurrentAccount) => {
    setSelectedAccount(account);
    setViewMode('details');
  };

  const handlePayment = (account: CurrentAccount) => {
    setSelectedAccount(account);
    setShowPaymentDialog(true);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAccount(null);
  };

  const handleFormSuccess = () => {
    setViewMode('list');
    loadStatistics();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    if (selectedAccount) {
      // Recargar detalles de la cuenta
      loadAccountDetails();
    }
    // Recargar estadísticas de las tarjetas y tabla
    loadStatistics();
    // Emitir evento para que CurrentAccountList recargue su datos
    window.dispatchEvent(new CustomEvent('paymentSuccess'));
  };


  const handleExport = async () => {
    try {
      const data = await CurrentAccountService.exportMovements(0); // 0 = exportar todos
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const loadAccountDetails = async () => {
    if (!selectedAccount) return;

    try {
      const account = await CurrentAccountService.getById(selectedAccount.id);
      setSelectedAccount(account);
    } catch (error) {
      console.error('Error loading account details:', error);
    }
  };

  // Funciones de procesamiento de pagos integradas en los diálogos

  const renderStatistics = () => {
    if (loadingStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Solo usar datos reales de la API, sin fallback a datos mock
    if (!statistics) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6 text-center">
              <div className="text-gray-500">
                <p>No se pudieron cargar las estadísticas</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadStatistics}
                  className="mt-2"
                >
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const stats = statistics;

    return (
      <>
        {/* Total pendiente de cobro - Rojo */}
        <Card className="bg-red-50 text-black border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Total Pendiente de Cobro</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {CurrentAccountUtils.formatCurrency(stats.total_current_balance)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Total adeudado por clientes
            </p>
          </CardContent>
        </Card>

        {/* Clientes con deuda - Rojo */}
        <Card className="bg-red-100 text-black border-red-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Clientes con Deuda</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {stats.overdrawn_accounts}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Con saldo adeudado
            </p>
          </CardContent>
        </Card>

        {/* Cliente con mayor deuda - Amarillo */}
        <Card className="bg-yellow-100 text-black border-yellow-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Cliente con Mayor Deuda</CardTitle>
            <User className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-black">
              {stats.client_with_highest_debt ? (
                <>
                  <div className="text-sm truncate text-black" title={stats.client_with_highest_debt.name}>
                    {stats.client_with_highest_debt.name}
                  </div>
                  <div className="text-xl text-black">
                    {CurrentAccountUtils.formatCurrency(stats.client_with_highest_debt.debt_amount)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-black">Sin deudas</div>
                  <div className="text-xl text-black">$0,00</div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Nombre + monto
            </p>
          </CardContent>
        </Card>

        {/* Cuentas Activas - Celeste */}
        <Card className="bg-cyan-100 text-black border-cyan-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-black">Cuentas Activas</CardTitle>
            <BarChart3 className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {stats.active_accounts ?? 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Con operaciones habilitadas
            </p>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'form':
        return (
          <CurrentAccountForm
            open={true}
            onOpenChange={() => setViewMode('list')}
            account={selectedAccount}
            onSuccess={handleFormSuccess}
          />
        );

      case 'details':
        return selectedAccount ? (
          <CurrentAccountDetails
            accountId={selectedAccount.id}
            onBack={handleBackToList}
            onStatsRefresh={loadStatistics}
          />
        ) : null;

      case 'list':
      default:
        return (
          <CurrentAccountList
            onEdit={handleEditAccount}
            onView={handleViewAccount}
            onCreate={handleCreateAccount}
            onPayment={handlePayment}
            initialSearchTerm={searchTerm}
            initialStatusFilter={statusFilter}
            initialBalanceFilter={balanceFilter}
          />
        );
    }
  };

  return (
    <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
      {/* Header como en Clientes - Solo mostrar en modo lista */}
      {viewMode === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cuentas Corrientes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Las cuentas corrientes se crean automáticamente al crear clientes
              </p>
            </div>
          </div>

          {/* Estadísticas como cards separadas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resumen General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderStatistics()}
            </div>
          </div>
        </>
      )}

      {/* Barra de búsqueda y filtros - Solo mostrar en modo lista */}
      {viewMode === 'list' && (
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por cliente, email, CUIT o teléfono..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Dropdown para estados de cuenta */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[140px]">
                  {statusFilter === '' ? 'Todos los estados' :
                    statusFilter === 'active' ? 'Activas' :
                      statusFilter === 'suspended' ? 'Suspendidas' : 'Todos los estados'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                <DropdownMenuItem onClick={() => setStatusFilter('')}>
                  <Check className={`mr-2 h-4 w-4 ${statusFilter === '' ? 'opacity-100' : 'opacity-0'}`} />
                  Todos los estados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  <Check className={`mr-2 h-4 w-4 ${statusFilter === 'active' ? 'opacity-100' : 'opacity-0'}`} />
                  Activas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('suspended')}>
                  <Check className={`mr-2 h-4 w-4 ${statusFilter === 'suspended' ? 'opacity-100' : 'opacity-0'}`} />
                  Suspendidas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dropdown para estados del balance */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[160px]">
                  {balanceFilter === '' ? 'Todos los balances' :
                    balanceFilter === 'negative' ? 'Con deuda' : 'Todos los balances'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={() => setBalanceFilter('')}>
                  <Check className={`mr-2 h-4 w-4 ${balanceFilter === '' ? 'opacity-100' : 'opacity-0'}`} />
                  Todos los balances
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBalanceFilter('negative')}>
                  <Check className={`mr-2 h-4 w-4 ${balanceFilter === 'negative' ? 'opacity-100' : 'opacity-0'}`} />
                  Con deuda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {hasPermission('exportar_movimientos_cuentas_corrientes') && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1">
        {renderContent()}
      </div>

      {/* Diálogos */}
      {selectedAccount && (
        <>
          <PaymentDialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            accountId={selectedAccount.id}
            currentBalance={selectedAccount.current_balance}
            onSuccess={handlePaymentSuccess}
          />

        </>
      )}
    </div>
  );
}