import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Pagination from '@/components/ui/pagination';
import { sileo } from "sileo"
import {
    ArrowLeft,
    CreditCard,
    DollarSign,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    Handshake,
} from 'lucide-react';
import { CurrentAccount, CurrentAccountMovement, PaginatedResponse } from '@/types/currentAccount';
import type { ExternalRepairService } from '@/types/repairs';
import { CurrentAccountService, CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { CheckboxMultiSelect, type CheckboxOption } from '@/components/ui/checkbox-multi-select';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';
import { useRepairs } from '@/hooks/useRepairs';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';

interface SupplierCurrentAccountDetailsProps {
    accountId: number;
    onBack: () => void;
}

export function SupplierCurrentAccountDetails({ accountId, onBack }: SupplierCurrentAccountDetailsProps) {
    const { isModuleEnabled } = usePermissions();
    const repairsEnabled = isModuleEnabled('repairs');
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
    const [externalDebts, setExternalDebts] = useState<ExternalRepairService[]>([]);
    const [loadingExternalDebts, setLoadingExternalDebts] = useState(false);
    const [showExternalPaymentDialog, setShowExternalPaymentDialog] = useState(false);
    const [selectedExternalDebt, setSelectedExternalDebt] = useState<ExternalRepairService | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; name: string }>>([]);
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
    const [openCashRegisters, setOpenCashRegisters] = useState<Array<{ id: number; branch_id: number; opened_at?: string | null }>>([]);
    const [loadingCashRegisters, setLoadingCashRegisters] = useState(false);
    const [externalCashRegisterId, setExternalCashRegisterId] = useState<string>('');
    const [externalPaymentMethodId, setExternalPaymentMethodId] = useState<string>('');
    const [externalPaymentAmount, setExternalPaymentAmount] = useState<string>('');
    const [externalPaymentNotes, setExternalPaymentNotes] = useState<string>('');
    const [payingExternalDebt, setPayingExternalDebt] = useState(false);

    const { getExternalDebtsBySupplier, payExternalService } = useRepairs({ autoFetch: false });

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
            sileo.error({ title: 'Error al cargar los detalles de la cuenta' });
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
            sileo.error({ title: 'Error al cargar los movimientos' });
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

    const loadExternalDebts = React.useCallback(async (supplierId: number) => {
        try {
            setLoadingExternalDebts(true);
            const debts = await getExternalDebtsBySupplier(supplierId, {
                payment_status: 'pending',
            });
            setExternalDebts(debts);
        } catch (error) {
            console.error('Error loading external debts:', error);
            sileo.error({ title: 'Error al cargar deuda de reparaciones externas' });
        } finally {
            setLoadingExternalDebts(false);
        }
    }, [getExternalDebtsBySupplier]);

    const loadPaymentMethods = React.useCallback(async () => {
        try {
            setLoadingPaymentMethods(true);
            const resp = await api.get('/payment-methods', { params: { limit: 100 } });
            const data = Array.isArray(resp?.data?.data)
                ? resp.data.data
                : Array.isArray(resp?.data)
                    ? resp.data
                    : [];

            const mapped = data
                .filter((item): item is { id: unknown; name: unknown; is_customer_credit?: boolean; is_active?: boolean } => (
                    typeof item === 'object' && item !== null && 'id' in item && 'name' in item
                ))
                .map((item) => ({
                    id: Number(item.id),
                    name: String(item.name),
                    is_customer_credit: Boolean(item.is_customer_credit),
                    is_active: typeof item.is_active === 'boolean' ? item.is_active : true,
                }))
                .filter((method) => method.is_active)
                .filter((method) => {
                    const nameLower = method.name.toLowerCase().trim();
                    return !method.is_customer_credit && !nameLower.includes('cuenta corriente');
                })
                .map(({ id, name }) => ({ id, name }));
            setPaymentMethods(mapped);
        } catch (error) {
            console.error('Error loading payment methods:', error);
        } finally {
            setLoadingPaymentMethods(false);
        }
    }, []);

    const loadOpenCashRegisters = React.useCallback(async () => {
        try {
            setLoadingCashRegisters(true);

            const userBranchesResp = await api.get('/my-branches');
            const userBranches = userBranchesResp?.data?.data || userBranchesResp?.data || [];
            const userBranchIds: number[] = (Array.isArray(userBranches) ? userBranches : [])
                .map((b: { id?: unknown }) => Number(b.id))
                .filter((id) => Number.isFinite(id) && id > 0);

            const resp = await api.get('/cash-registers', { params: { status: 'open' } });
            const allRegisters = resp?.data?.data || resp?.data || [];
            const filtered = (Array.isArray(allRegisters) ? allRegisters : [])
                .filter((reg: { id?: unknown; branch_id?: unknown }) => {
                    const branchId = Number(reg.branch_id);
                    return Number.isFinite(branchId) && userBranchIds.includes(branchId);
                })
                .map((reg: { id?: unknown; branch_id?: unknown; opened_at?: string | null }) => ({
                    id: Number(reg.id),
                    branch_id: Number(reg.branch_id),
                    opened_at: reg.opened_at ?? null,
                }))
                .filter((reg) => Number.isFinite(reg.id) && reg.id > 0);

            setOpenCashRegisters(filtered);

            if (filtered.length > 0) {
                setExternalCashRegisterId(String(filtered[0].id));
            } else {
                setExternalCashRegisterId('');
            }
        } catch (error) {
            console.error('Error loading open cash registers:', error);
            setOpenCashRegisters([]);
            setExternalCashRegisterId('');
        } finally {
            setLoadingCashRegisters(false);
        }
    }, []);


    useEffect(() => {
        loadAccountDetails();
        loadFilters();
        loadPaymentMethods();
        loadOpenCashRegisters();
        setCurrentPage(1);
        scrollPositionRef.current = 0;
    }, [accountId, loadAccountDetails, loadFilters, loadPaymentMethods, loadOpenCashRegisters]);

    useEffect(() => {
        if (!repairsEnabled) {
            setExternalDebts([]);
            return;
        }

        if (!account?.supplier_id) return;
        loadExternalDebts(account.supplier_id);
    }, [account?.supplier_id, loadExternalDebts, repairsEnabled]);

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
        if (account?.supplier_id) {
            loadExternalDebts(account.supplier_id);
        }
    };

    const openExternalPaymentDialog = (debt: ExternalRepairService) => {
        setSelectedExternalDebt(debt);
        setExternalPaymentMethodId('');
        setExternalCashRegisterId((prev) => prev || (openCashRegisters.length > 0 ? String(openCashRegisters[0].id) : ''));
        setExternalPaymentAmount(String(debt.pending_amount ?? ''));
        setExternalPaymentNotes('');
        setShowExternalPaymentDialog(true);
    };

    const handleExternalPayment = async () => {
        if (!selectedExternalDebt) return;

        const methodId = parseInt(externalPaymentMethodId, 10);
        const cashRegisterId = parseInt(externalCashRegisterId, 10);
        const amount = parseFloat(externalPaymentAmount);

        if (!Number.isFinite(methodId) || methodId <= 0) {
            sileo.error({ title: 'Seleccioná un método de pago' });
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0 || amount > selectedExternalDebt.pending_amount) {
            sileo.error({ title: 'Monto inválido para el saldo pendiente' });
            return;
        }

        if (!Number.isFinite(cashRegisterId) || cashRegisterId <= 0) {
            sileo.error({ title: 'Seleccioná una caja abierta' });
            return;
        }

        try {
            setPayingExternalDebt(true);
            const repair = await payExternalService(selectedExternalDebt.repair_id, {
                amount,
                payment_method_id: methodId,
                cash_register_id: cashRegisterId,
                notes: externalPaymentNotes || undefined,
            });

            if (!repair) {
                sileo.error({ title: 'No se pudo registrar el pago' });
                return;
            }

            sileo.success({ title: 'Pago por reparación registrado' });
            setShowExternalPaymentDialog(false);
            handleSuccess();
        } catch (error) {
            console.error('Error paying external debt:', error);
            sileo.error({ title: 'No se pudo registrar el pago' });
        } finally {
            setPayingExternalDebt(false);
        }
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
                <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
                    <TabsTrigger value="movements">Movimientos</TabsTrigger>
                    {repairsEnabled && <TabsTrigger value="external-repairs">Reparaciones externas</TabsTrigger>}
                    <TabsTrigger value="info">Información</TabsTrigger>
                </TabsList>

                {repairsEnabled && (
                    <TabsContent value="external-repairs">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Handshake className="h-4 w-4" />
                                    Deuda por reparaciones derivadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingExternalDebts ? (
                                    <p className="text-sm text-muted-foreground">Cargando reparaciones externas...</p>
                                ) : externalDebts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No hay deuda pendiente de reparaciones externas para este proveedor.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {externalDebts.map((debt) => (
                                            <div key={debt.id} className="rounded-lg border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-medium">
                                                        Reparación {debt.repair_code || `#${debt.repair_id}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Costo: {CurrentAccountUtils.formatCurrency(debt.agreed_cost)} | Pagado: {CurrentAccountUtils.formatCurrency(debt.paid_amount)}
                                                    </p>
                                                    <p className="text-xs text-amber-700 font-medium">
                                                        Pendiente: {CurrentAccountUtils.formatCurrency(debt.pending_amount)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {debt.payment_status === 'paid' ? 'Pagado' : debt.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                                                    </Badge>
                                                    {debt.pending_amount > 0.01 && (
                                                        <Button size="sm" onClick={() => openExternalPaymentDialog(debt)}>
                                                            Pagar reparación
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

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

            <Dialog open={showExternalPaymentDialog} onOpenChange={setShowExternalPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pagar reparación externa</DialogTitle>
                        <DialogDescription>
                            {selectedExternalDebt
                                ? `Reparación ${selectedExternalDebt.repair_code || `#${selectedExternalDebt.repair_id}`} - Pendiente ${CurrentAccountUtils.formatCurrency(selectedExternalDebt.pending_amount)}`
                                : 'Ingresá los datos del pago'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div>
                            <Label>Método de pago</Label>
                            <Select value={externalPaymentMethodId} onValueChange={setExternalPaymentMethodId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar método" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No hay métodos de pago disponibles
                                        </div>
                                    ) : (
                                        paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={String(method.id)}>
                                                {method.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {loadingPaymentMethods && (
                                <p className="mt-1 text-xs text-muted-foreground">Cargando métodos de pago...</p>
                            )}
                            {paymentMethods.length === 0 && (
                                <p className="mt-1 text-xs text-amber-700">
                                    No se puede registrar el pago hasta que exista al menos un método de pago activo.
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Caja abierta</Label>
                            <Select value={externalCashRegisterId} onValueChange={setExternalCashRegisterId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar caja" />
                                </SelectTrigger>
                                <SelectContent>
                                    {openCashRegisters.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No hay cajas abiertas disponibles
                                        </div>
                                    ) : (
                                        openCashRegisters.map((register) => (
                                            <SelectItem key={register.id} value={String(register.id)}>
                                                Caja #{register.id} - Sucursal {register.branch_id}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {loadingCashRegisters && (
                                <p className="mt-1 text-xs text-muted-foreground">Cargando cajas abiertas...</p>
                            )}
                            {openCashRegisters.length === 0 && (
                                <p className="mt-1 text-xs text-amber-700">
                                    No se puede registrar el pago hasta abrir una caja.
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Monto</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={String(selectedExternalDebt?.pending_amount ?? '')}
                                value={externalPaymentAmount}
                                onChange={(e) => setExternalPaymentAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Notas</Label>
                            <Input
                                value={externalPaymentNotes}
                                onChange={(e) => setExternalPaymentNotes(e.target.value)}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExternalPaymentDialog(false)} disabled={payingExternalDebt}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleExternalPayment}
                            disabled={
                                payingExternalDebt ||
                                paymentMethods.length === 0 ||
                                openCashRegisters.length === 0 ||
                                !externalPaymentMethodId ||
                                !externalCashRegisterId
                            }
                        >
                            {payingExternalDebt ? 'Procesando...' : 'Confirmar pago'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
