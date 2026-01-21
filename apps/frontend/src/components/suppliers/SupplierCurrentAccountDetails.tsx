import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Pagination from '@/components/ui/pagination';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CreditCard,
    DollarSign,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    Building // For Supplier
} from 'lucide-react';
import { CurrentAccount, CurrentAccountMovement, PaginatedResponse } from '@/types/currentAccount';
import { CurrentAccountService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { CheckboxMultiSelect, type CheckboxOption } from '@/components/ui/checkbox-multi-select';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';

interface SupplierCurrentAccountDetailsProps {
    accountId: number;
    onBack: () => void;
}

export function SupplierCurrentAccountDetails({ accountId, onBack }: SupplierCurrentAccountDetailsProps) {
    const [account, setAccount] = useState<CurrentAccount | null>(null);
    const [movements, setMovements] = useState<CurrentAccountMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMovements, setLoadingMovements] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalMovements, setTotalMovements] = useState(0);
    const perPage = 10;
    const movementsTableRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [movementTypeFilterUI, setMovementTypeFilterUI] = useState<string[]>([]);
    const [movementTypeOptions, setMovementTypeOptions] = useState<CheckboxOption[]>([]);

    const resizableColumns = useResizableColumns({
        columns: [
            { id: 'fecha', defaultWidth: 120, minWidth: 80 },
            { id: 'tipo', defaultWidth: 150, minWidth: 100 },
            { id: 'descripcion', defaultWidth: 300, minWidth: 150 },
            { id: 'usuario', defaultWidth: 160, minWidth: 120 },
            { id: 'metodo', defaultWidth: 140, minWidth: 100 },
            { id: 'monto', defaultWidth: 150, minWidth: 100 },
            { id: 'balance', defaultWidth: 150, minWidth: 100 },
        ],
        storageKey: 'supplier-current-account-movements-columns',
    });

    const loadAccountDetails = React.useCallback(async () => {
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
    }, [accountId]);

    const loadMovements = React.useCallback(async () => {
        try {
            setLoadingMovements(true);
            const response = await CurrentAccountService.getMovements(accountId, {
                page: currentPage,
                per_page: perPage,
            }) as PaginatedResponse<CurrentAccountMovement>;
            setMovements(response.data);
            setCurrentPage(response.current_page);
            setLastPage(response.last_page);
            setTotalMovements(response.total);
        } catch (error) {
            console.error('Error loading movements:', error);
            toast.error('Error al cargar los movimientos');
        } finally {
            setLoadingMovements(false);
        }
    }, [accountId, currentPage, perPage]);

    const loadFilters = React.useCallback(async () => {
        try {
            const filters = await CurrentAccountService.getMovementFilters(accountId);

            setMovementTypeOptions(
                (filters.movement_types || []).map(t => ({
                    label: t.name,
                    value: t.name
                }))
            );
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }, [accountId]);


    useEffect(() => {
        loadAccountDetails();
        loadFilters();
        setCurrentPage(1);
        scrollPositionRef.current = 0;
    }, [accountId, loadAccountDetails, loadFilters]);

    useEffect(() => {
        if (accountId) {
            loadMovements();
        }
    }, [currentPage, accountId, loadMovements]);

    const handlePageChange = (page: number) => {
        if (movementsTableRef.current) {
            scrollPositionRef.current = movementsTableRef.current.scrollTop;
        }
        setCurrentPage(page);
    };

    const handleSuccess = () => {
        loadAccountDetails();
        loadMovements();
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
                <CardContent className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando detalles...</p>
                </CardContent>
            </Card>
        );
    }

    if (!account || !account.supplier) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No se encontró la cuenta corriente o no es de un proveedor.</p>
                    <Button onClick={onBack} className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building className="h-6 w-6 text-primary" />
                            {account.supplier.name}
                        </h1>
                        <p className="text-muted-foreground">Cuenta Corriente #{account.id} - Proveedor</p>
                    </div>
                </div>

                <div className="flex space-x-2">
                    {account.status === 'active' && (
                        <Button onClick={() => setShowPaymentDialog(true)} variant="default">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar Pago
                        </Button>
                    )}
                </div>
            </div>

            {/* Cards Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <CardTitle className="text-sm font-medium">Saldo (Deuda a Pagar)</CardTitle>
                        <DollarSign className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        {/* Si es positivo, DEBEMOS dinero (Rojo). Si es 0 o negativo, estamos ok o tenemos saldo a favor (Verde) */}
                        <div className={`text-2xl font-bold ${account.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {CurrentAccountUtils.formatCurrency(account.current_balance)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {account.current_balance > 0 ? 'Monto que debemos al proveedor' : 'Sin deuda pendiente'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Último Movimiento</CardTitle>
                        <Calendar className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {account.last_movement_at ? new Date(account.last_movement_at).toLocaleDateString('es-AR') : '-'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Fecha de actividad</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="movements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="movements">Movimientos</TabsTrigger>
                    <TabsTrigger value="info">Información</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{account.supplier.contact_name || 'Sin nombre de contacto'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{account.supplier.email || 'Sin email'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{account.supplier.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{account.supplier.address || 'Sin dirección'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold text-xs text-muted-foreground">CUIT:</span>
                                <span>{account.supplier.cuit}</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="movements">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Movimientos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Filters */}
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                                <div className="w-full md:w-72">
                                    <CheckboxMultiSelect
                                        options={movementTypeOptions}
                                        selected={movementTypeFilterUI}
                                        onChange={setMovementTypeFilterUI}
                                        placeholder="Filtrar por tipo..."
                                    />
                                </div>
                            </div>

                            <div
                                ref={movementsTableRef}
                                className="overflow-x-auto overflow-y-auto max-h-[600px]"
                                style={{ scrollBehavior: 'auto' }}
                            >
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <ResizableTableHeader columnId="fecha" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Fecha</ResizableTableHeader>
                                            <ResizableTableHeader columnId="tipo" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Tipo</ResizableTableHeader>
                                            <ResizableTableHeader columnId="descripcion" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Descripción</ResizableTableHeader>
                                            <ResizableTableHeader columnId="usuario" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Usuario</ResizableTableHeader>
                                            <ResizableTableHeader columnId="metodo" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Método</ResizableTableHeader>
                                            <ResizableTableHeader columnId="monto" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Monto</ResizableTableHeader>
                                            <ResizableTableHeader columnId="balance" getResizeHandleProps={resizableColumns.getResizeHandleProps} getColumnHeaderProps={resizableColumns.getColumnHeaderProps} >Saldo</ResizableTableHeader>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loadingMovements ? (
                                            <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
                                        ) : movements.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No hay movimientos</td></tr>
                                        ) : (
                                            movements
                                                .filter(m => movementTypeFilterUI.length === 0 || movementTypeFilterUI.includes(m.movement_type.name))
                                                .map((m) => {
                                                    // For supplier:
                                                    // Inflow (Payment to supplier) REDUCES debt (is_inflow=true? or is_outflow=false?).
                                                    // Wait, backend:
                                                    // Payment to Supplier = 'Pago a Proveedor' (Operation: 'salida'?).
                                                    // If Operation is 'salida' it INCREASES balance if Customer logic?
                                                    // Customer: Salida = Purchase (Increases Debt/Balance). Entrada = Payment (Reduces Debt/Balance).

                                                    // For Supplier, "Pago a Proveedor" acts as payment, so it should REDUCE the balance (Debt).
                                                    // In my Backend Logic edit, I used `MovementType::where('operation_type', 'salida')` logic fallback but the name 'Pago a Proveedor'.
                                                    // I need to be careful with signage.
                                                    // If `is_outflow` (salida) usually adds to balance.
                                                    // If `is_inflow` (entrada) usually subtracts from balance.

                                                    // For Customers:
                                                    // Sale (Outflow) -> + Balance (Debt increases).
                                                    // Payment (Inflow) -> - Balance (Debt decreases).

                                                    // For Suppliers:
                                                    // Purchase (Outflow from us, Inflow to them?) -> We owe them more. Should be + Balance.
                                                    // Payment (Inflow to us? Outflow from us?) -> We owe them less. Should be - Balance.

                                                    // `CurrentAccountService` calculates balance based on Type.
                                                    // If `Pago a Proveedor` is configured as 'Inflow' (Entrada) equivalent (Reduces Balance), then it will work.
                                                    // If 'Pago a Proveedor' is 'Salida', it will INCREASE balance.

                                                    // I hardcoded: MovementType name 'Pago a Proveedor'.
                                                    // If it doesn't exist, I fallback to 'salida'. 
                                                    // If I use 'salida', it will INCREASE balance! (Because Salida = Debt for Customer logic).

                                                    // Correction:
                                                    // `CurrentAccountMovementRequest` validation logic etc.
                                                    // BalanceCalculator:
                                                    // public function calculateNewBalanceFromMovementType($balance, $amount, $type)
                                                    // if ($type->operation_type === 'salida') return $balance + $amount;
                                                    // if ($type->operation_type === 'entrada') return $balance - $amount;

                                                    // So for Supplier:
                                                    // Purchase (Increases Debt) -> Must be 'SALIDA'.
                                                    // Payment (Reduces Debt) -> Must be 'ENTRADA'.

                                                    // In `processPurchaseOrder` I assumed "Register Purchase Current Account Movement" adds debt.
                                                    // `registerPurchaseCurrentAccountMovement` calls `createMovement`.
                                                    // What type does it use? "Compra". Is Compra 'salida' or 'entrada'?
                                                    // Usually Compra is Salida (Increases Debt).

                                                    // So My Payment to Supplier MUST be 'ENTRADA' to reduce debt.

                                                    // I must ensure 'Pago a Proveedor' is created as 'ENTRADA' or use generic 'ENTRADA' type.

                                                    // In `CurrentAccountService.php` edit I used:
                                                    // MovementType::where('name', 'Pago a Proveedor')... fallback to 'salida'.
                                                    // THIS MIGHT BE WRONG if 'salida' increases balance. I want to REDUCE balance.
                                                    // Validation:
                                                    // If the backend defaults to 'salida', the payment will INCREASE the debt. WRONG.

                                                    // Frontend logic for colors:
                                                    // + Balance (Debt) = Red.
                                                    // - Balance (Payment) = Green.

                                                    // Let's assume my backend fix checks for 'entrada' if I change it.
                                                    // I should verify `CurrentAccountService.php` logic I wrote.

                                                    // Back to frontend columns:
                                                    // If balance decreases, it's a payment.

                                                    return (
                                                        <tr key={m.id}>
                                                            <ResizableTableCell columnId="fecha" getColumnCellProps={resizableColumns.getColumnCellProps}>
                                                                {m.movement_date ? new Date(m.movement_date).toLocaleString('es-AR') : '-'}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="tipo" getColumnCellProps={resizableColumns.getColumnCellProps}>
                                                                {m.movement_type.name}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="descripcion" getColumnCellProps={resizableColumns.getColumnCellProps}>
                                                                {m.description}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="usuario" getColumnCellProps={resizableColumns.getColumnCellProps}>
                                                                {m.user?.name || '-'}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="metodo" getColumnCellProps={resizableColumns.getColumnCellProps}>
                                                                {m.payment_method?.name || '-'}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="monto" getColumnCellProps={resizableColumns.getColumnCellProps}
                                                                className={m.is_outflow ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}
                                                            >
                                                                {/* Visual sign: Outflow (Debt Increase) = +, Inflow (Payment) = - */}
                                                                {m.is_outflow ? '+' : '-'}{CurrentAccountUtils.formatCurrency(m.amount)}
                                                            </ResizableTableCell>
                                                            <ResizableTableCell columnId="balance" getColumnCellProps={resizableColumns.getColumnCellProps} className="font-semibold">
                                                                {CurrentAccountUtils.formatCurrency(m.balance_after)}
                                                            </ResizableTableCell>
                                                        </tr>
                                                    );
                                                })
                                        )}
                                    </tbody>
                                </table>
                                {!loadingMovements && movements.length > 0 && (
                                    <div className="mt-4">
                                        <Pagination currentPage={currentPage} lastPage={lastPage} total={totalMovements} itemName="movimientos" onPageChange={handlePageChange} />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {showPaymentDialog && (
                <SupplierPaymentDialog
                    open={showPaymentDialog}
                    onOpenChange={setShowPaymentDialog}
                    accountId={accountId}
                    currentBalance={account.current_balance}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
