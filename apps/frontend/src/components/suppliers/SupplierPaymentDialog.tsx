import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { sileo } from "sileo"
import { CreditCard, Loader2 } from 'lucide-react';
import { CurrentAccountService } from '@/lib/services/currentAccountService';
import api from '@/lib/api';

interface SupplierPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: number;
    currentBalance: number | null | undefined;
    onSuccess: () => void;
}

interface PaymentMethod {
    id: number;
    name: string;
    is_active?: boolean;
}

export function SupplierPaymentDialog({ open, onOpenChange, accountId, currentBalance, onSuccess }: SupplierPaymentDialogProps) {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedCashRegister, setSelectedCashRegister] = useState<string>('');
    const [openCashRegisters, setOpenCashRegisters] = useState<any[]>([]); // To populate if needed, or just fetch user's open register

    // For simplicity, we'll try to auto-select user's open cash register if cash method is selected.
    // Or explicitly ask for it if there are multiple.
    // For now, let's assume standard payment flow: Method -> Amount.
    // We'll fetch payment methods.

    const loadPaymentMethods = useCallback(async () => {
        try {
            const response = await api.get('/payment-methods');
            const allMethods = response.data.data || response.data;

            // Filter active methods
            const filteredMethods = allMethods.filter((method: PaymentMethod) => {
                if (!method.is_active) return false;
                const nameLower = method.name.toLowerCase().trim();
                // Exclude "Cuenta Corriente" itself (paying debt with debt?)
                if (nameLower.includes('cuenta corriente')) return false;
                return true;
            });

            setPaymentMethods(filteredMethods);
        } catch (error) {
            console.error('Error loading payment methods:', error);
            sileo.error({ title: 'Error al cargar métodos de pago' });
        } finally {
            //
        }
    }, []);

    // Fetch open cash registers for the current user?
    // Use useAuth or API.
    // For now, let's send cash_register_id only if method is cash.
    // We'll need to know which methods are "cash". Usually by "is_cash" flag or "Efectivo" name.
    // But processSupplierPayment backend checks "if (cashRegisterId)".
    // We should fetch open cash registers to let user select one if they pay with Cash.

    const loadOpenCashRegisters = useCallback(async () => {
        try {
            // First get user's branches
            const userBranchesResp = await api.get('/my-branches');
            const userBranches = userBranchesResp.data.data || userBranchesResp.data || [];
            const userBranchIds = userBranches.map((b: any) => b.id);

            // Then get open registers
            const resp = await api.get('/cash-registers', { params: { status: 'open' } });
            const allRegisters = resp.data.data || resp.data;

            // Filter to only user's branches
            const filteredRegisters = allRegisters.filter((reg: any) =>
                userBranchIds.includes(reg.branch_id)
            );

            setOpenCashRegisters(filteredRegisters);
            if (filteredRegisters.length > 0) {
                setSelectedCashRegister(filteredRegisters[0].id.toString());
            }
        } catch (error) {
            console.error('Error loading cash registers', error);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadPaymentMethods();
            loadOpenCashRegisters();
            setAmount('');
            setDescription('Pago a proveedor');
            setNotes('');
            setSelectedPaymentMethod('');
        }
    }, [open, loadPaymentMethods, loadOpenCashRegisters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPaymentMethod) {
            sileo.error({ title: 'Selecciona un método de pago' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            sileo.error({ title: 'Ingresa un monto válido' });
            return;
        }

        try {
            setLoading(true);

            const paymentData = {
                amount: numAmount,
                payment_method_id: parseInt(selectedPaymentMethod),
                description: description,
                notes: notes,
                cash_register_id: selectedCashRegister ? parseInt(selectedCashRegister) : undefined
            };

            await CurrentAccountService.processSupplierPayment(accountId, paymentData);

            sileo.success({ title: 'Pago registrado exitosamente' });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error processing payment:', error);
            const message = error?.response?.data?.message || error?.message || 'Error al procesar el pago';
            sileo.error({ title: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Registrar Pago a Proveedor
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Deuda Actual:</span>
                            <span className="font-bold text-lg text-red-600">
                                ${(currentBalance || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto a Pagar *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="pl-8"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setAmount((currentBalance || 0).toString())}
                            >
                                Pagar Total
                            </Button>
                        </div>
                        {amount && !isNaN(parseFloat(amount)) && (
                            <div className="flex justify-end text-sm mt-1">
                                <span className="text-muted-foreground mr-2">Saldo restante:</span>
                                <span className={((currentBalance || 0) - parseFloat(amount)) > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                    ${((currentBalance || 0) - parseFloat(amount)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="payment_method">Método de Pago *</Label>
                        <Select
                            value={selectedPaymentMethod}
                            onValueChange={setSelectedPaymentMethod}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un método" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                    <SelectItem key={method.id} value={method.id.toString()}>
                                        {method.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Optional: Cash Register Selection if needed. For now we use the first open one found or none if not cash? 
              Ideally we should show this if the user selects 'Efectivo'. 
              But let's keep it simple: always show if there are open registers, or hidden logic.
              Actually, let's show it to be safe.
          */}
                    {openCashRegisters.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="cash_register">Sucursal *</Label>
                            <Select
                                value={selectedCashRegister}
                                onValueChange={setSelectedCashRegister}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {openCashRegisters.map((reg) => (
                                        <SelectItem key={reg.id} value={reg.id.toString()}>
                                            {reg.branch?.name || reg.branch?.description || `Sucursal #${reg.branch_id}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Se registrará un movimiento de salida en la caja abierta de esta sucursal.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Input
                            id="description"
                            value={description}
                            readOnly
                            className="bg-muted text-muted-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas Adicionales</Label>
                        <Input
                            id="notes"
                            placeholder="Detalles extra..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !amount || parseFloat(amount) <= 0 || !selectedPaymentMethod}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                'Registrar Pago'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
